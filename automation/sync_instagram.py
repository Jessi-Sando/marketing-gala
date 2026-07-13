"""Revisa las 6 cuentas de Instagram, detecta publicaciones que todavia no
estan en data.js y las agrega automaticamente (marcadas como
'auto-detectado'), con tipo de pieza (reel/flyer/carrusel), likes y
reproducciones cuando aplica.

Uso:
  python sync_instagram.py            -> aplica los cambios a data.js
  python sync_instagram.py --dry-run  -> solo muestra que agregaria, no toca nada
"""

import datetime
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from common import (  # noqa: E402
    DATA_JS_PATH,
    IG_ACCOUNTS,
    classify_format,
    derive_desc,
    derive_title,
    format_date_meta,
    js_escape,
    month_key_for,
    shortcode_from_permalink,
)
from data_js_editor import (  # noqa: E402
    extract_tracked_signatures,
    insert_item,
    read_data_js,
    replace_item,
    write_data_js,
)
from exchange_token import ENV_PATH, load_env  # noqa: E402
from flag_overdue import reconcile_unit  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GRAPH_VERSION = "v21.0"
TRACKED_YEAR = 2026
MEDIA_FIELDS = "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink"


def get_token():
    token = os.environ.get("IG_LONG_LIVED_TOKEN")
    if token:
        return token
    env = load_env(ENV_PATH)
    return env.get("IG_LONG_LIVED_TOKEN")


def api_get(path, token, **params):
    params["access_token"] = token
    url = f"https://graph.facebook.com/{GRAPH_VERSION}/{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_recent_media(ig_id, token):
    results = []
    try:
        data = api_get(f"{ig_id}/media", token, fields=MEDIA_FIELDS, limit=50)
    except urllib.error.HTTPError as e:
        print(f"  Error al traer media: {e.read().decode('utf-8')}")
        return results

    pages_fetched = 0
    while True:
        for item in data.get("data", []):
            results.append(item)
        next_url = data.get("paging", {}).get("next")
        pages_fetched += 1
        oldest = data.get("data", [])[-1] if data.get("data") else None
        oldest_too_old = False
        if oldest:
            dt = datetime.datetime.strptime(oldest["timestamp"][:19], "%Y-%m-%dT%H:%M:%S")
            oldest_too_old = dt.year < TRACKED_YEAR or dt.month < 6
        if not next_url or pages_fetched >= 3 or oldest_too_old:
            break
        with urllib.request.urlopen(next_url) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    return results


def fetch_insight_metric(media_id, token, metric):
    try:
        data = api_get(f"{media_id}/insights", token, metric=metric)
        values = data.get("data", [])
        if values and values[0].get("values"):
            return values[0]["values"][0].get("value")
    except urllib.error.HTTPError:
        pass
    return None


def fetch_video_views(media_id, token):
    return fetch_insight_metric(media_id, token, "views")


def fetch_shares(media_id, token):
    return fetch_insight_metric(media_id, token, "shares")


def enrich_legacy_item_text(item_text, enrich):
    """Toma el texto de un item planificado a mano (sin likes/igId) y le
    agrega los datos reales del post que resulto ser, preservando el resto
    del item (tags propios, meta, titulo, desc) tal cual estaba."""
    parts = []
    if enrich.get("likes") is not None:
        parts.append(f'likes: {enrich["likes"]}')
    if enrich.get("comments"):
        parts.append(f'comments: {enrich["comments"]}')
    if enrich.get("views") is not None:
        parts.append(f'views: {enrich["views"]}')
    if enrich.get("shares") is not None:
        parts.append(f'shares: {enrich["shares"]}')
    parts.append(f'igId: "{enrich["igId"]}"')

    new_text = item_text[:-2].rstrip() + ", " + ", ".join(parts) + " }"

    # Si se habia marcado como vencido sin publicar y recien ahora se publico,
    # se saca esa leyenda (ya no aplica).
    new_text = re.sub(r'"planificado, no publicado",\s*', "", new_text)
    new_text = re.sub(r',\s*"planificado, no publicado"', "", new_text)

    if not re.search(r'"auto-detectado"', new_text):
        new_text = re.sub(r"tags:\s*\[", 'tags: ["auto-detectado", ', new_text, count=1)

    return new_text


def format_item_js(item):
    tags_js = ", ".join(f'"{t}"' for t in item["tags"])
    parts = [f'tags: [{tags_js}]', f'meta: "{js_escape(item["meta"])}"', f'title: "{js_escape(item["title"])}"']
    if item.get("desc"):
        parts.append(f'desc: "{js_escape(item["desc"])}"')
    else:
        parts.append('desc: ""')
    if item.get("likes") is not None:
        parts.append(f'likes: {item["likes"]}')
    if item.get("comments"):
        parts.append(f'comments: {item["comments"]}')
    if item.get("views") is not None:
        parts.append(f'views: {item["views"]}')
    if item.get("shares") is not None:
        parts.append(f'shares: {item["shares"]}')
    parts.append(f'igId: "{item["igId"]}"')
    return "{ " + ", ".join(parts) + " }"


def process_unit(unit_id, ig_id, token, text, dry_run):
    print(f"\n{unit_id}:")
    media_list = fetch_recent_media(ig_id, token)
    added = 0
    enriched = 0
    original_text = text  # snapshot fijo: los duplicados se chequean contra lo
    # que ya existia ANTES de esta corrida, no contra lo que se va insertando
    # ahora mismo (dos posts distintos pueden compartir el mismo dia).

    for media in media_list:
        ts = media.get("timestamp", "")
        try:
            dt = datetime.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
        dt = dt - datetime.timedelta(hours=3)  # Meta devuelve UTC; convertir a hora Argentina
        if dt.year != TRACKED_YEAR:
            continue
        month_key = month_key_for(dt)
        if not month_key:
            continue

        shortcode = shortcode_from_permalink(media.get("permalink"))
        date_meta = format_date_meta(dt)
        date_meta_prev = format_date_meta(dt - datetime.timedelta(days=1))
        date_meta_next = format_date_meta(dt + datetime.timedelta(days=1))

        igids, legacy_dates, legacy_items_by_date = extract_tracked_signatures(original_text, unit_id, month_key)

        if shortcode and shortcode in igids:
            continue  # ya enriquecido en una corrida anterior

        matched_legacy_text = (
            legacy_items_by_date.get(date_meta)
            or legacy_items_by_date.get(date_meta_prev)
            or legacy_items_by_date.get(date_meta_next)
        )
        already_tracked = (
            date_meta in legacy_dates or date_meta_prev in legacy_dates or date_meta_next in legacy_dates
        )

        media_type = media.get("media_type")
        formato = classify_format(media_type)

        if matched_legacy_text:
            # Habia un item planificado a mano para esta fecha: se enriquece
            # con los datos reales en vez de agregar uno nuevo duplicado.
            views = fetch_video_views(media["id"], token) if media_type == "VIDEO" else None
            shares = fetch_shares(media["id"], token)
            enrich = {
                "likes": media.get("like_count"),
                "comments": media.get("comments_count"),
                "views": views,
                "shares": shares,
                "igId": shortcode or media["id"],
            }
            print(f"  ~ [{month_key}] {date_meta} · se publico un item planificado, enriqueciendo")
            enriched += 1
            if not dry_run:
                new_text = enrich_legacy_item_text(matched_legacy_text, enrich)
                text = replace_item(text, matched_legacy_text, new_text)
            continue

        if already_tracked:
            continue

        views = fetch_video_views(media["id"], token) if media_type == "VIDEO" else None
        shares = fetch_shares(media["id"], token)

        title = derive_title(media.get("caption"))
        desc = derive_desc(media.get("caption"), title)

        item = {
            "tags": [formato, "auto-detectado"],
            "meta": date_meta,
            "title": title,
            "desc": desc,
            "shares": shares,
            "likes": media.get("like_count"),
            "comments": media.get("comments_count"),
            "views": views,
            "igId": shortcode or media["id"],
        }

        item_js = format_item_js(item)
        print(f"  + [{month_key}] {date_meta} · {formato} · {title}")
        added += 1

        if not dry_run:
            text = insert_item(text, unit_id, month_key, item_js)

    if added == 0 and enriched == 0:
        print("  (sin novedades)")

    text, flagged = reconcile_unit(text, unit_id, dry_run=dry_run)
    if flagged:
        print(f"  ⏳ {flagged} item(s) marcados como 'planificado, no publicado'")

    return text, added, enriched, flagged


def main():
    dry_run = "--dry-run" in sys.argv
    token = get_token()
    if not token:
        print("Falta IG_LONG_LIVED_TOKEN (variable de entorno o automation/.env).")
        return

    text = read_data_js(DATA_JS_PATH)
    total_added = 0
    total_enriched = 0
    total_flagged = 0

    for unit_id, ig_id in IG_ACCOUNTS.items():
        text, added, enriched, flagged = process_unit(unit_id, ig_id, token, text, dry_run)
        total_added += added
        total_enriched += enriched
        total_flagged += flagged

    print(f"\nTotal de publicaciones nuevas: {total_added}")
    print(f"Total de items enriquecidos (se publicaron): {total_enriched}")
    print(f"Total de items marcados 'planificado, no publicado': {total_flagged}")

    total_changed = total_added + total_enriched + total_flagged
    if dry_run:
        print("(--dry-run: no se modifico data.js)")
    elif total_changed > 0:
        write_data_js(DATA_JS_PATH, text)
        print("data.js actualizado.")
    else:
        print("data.js sin cambios.")


if __name__ == "__main__":
    main()
