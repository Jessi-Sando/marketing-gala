"""Agrega la foto/miniatura real de Instagram a los items de junio y julio
que ya estan confirmados como publicados (tienen likes) pero todavia no
tienen guardado el link de la imagen. No descarga el archivo: guarda el
link que entrega Instagram tal cual (puede vencer con el tiempo).

Cubre dos casos:
  - Items ya matcheados por la sincronizacion automatica (tienen igId):
    se busca directamente por ese shortcode.
  - Items cargados a mano antes de que existiera la deteccion automatica
    (tienen likes reales pero nunca se les guardo un igId): se busca el
    post real por fecha (+-1 dia), igual que hace sync_instagram.py al
    enriquecer un item planificado, y de paso se les agrega el igId.

Uso:
  python backfill_thumbnails.py            -> aplica los cambios a data.js
  python backfill_thumbnails.py --dry-run  -> solo muestra que actualizaria
"""

import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATA_JS_PATH, IG_ACCOUNTS, js_escape, parse_meta_date, shortcode_from_permalink  # noqa: E402
from data_js_editor import get_month_items, read_data_js, replace_item, write_data_js  # noqa: E402
from exchange_token import ENV_PATH, load_env  # noqa: E402
from sync_instagram import extract_image_url, fetch_recent_media  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MONTHS_TO_BACKFILL = ["junio", "julio"]
TRACKED_YEAR = 2026


def get_token():
    token = os.environ.get("IG_LONG_LIVED_TOKEN")
    if token:
        return token
    env = load_env(ENV_PATH)
    return env.get("IG_LONG_LIVED_TOKEN")


def index_media(media_list):
    """Indexa la media traida de la API por shortcode y por fecha (hora
    Argentina), para poder buscarla de las dos formas sin repetir llamadas
    a la API por cada item."""
    by_shortcode = {}
    by_date = {}
    for media in media_list:
        shortcode = shortcode_from_permalink(media.get("permalink"))
        if shortcode:
            by_shortcode[shortcode] = media
        ts = media.get("timestamp", "")
        try:
            dt = datetime.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            continue
        dt = dt - datetime.timedelta(hours=3)  # Meta devuelve UTC
        by_date.setdefault(dt.date(), []).append(media)
    return by_shortcode, by_date


def main():
    dry_run = "--dry-run" in sys.argv
    token = get_token()
    if not token:
        print("Falta IG_LONG_LIVED_TOKEN (variable de entorno o automation/.env).")
        return

    text = read_data_js(DATA_JS_PATH)
    updated = 0
    skipped_not_found = 0

    for unit_id, ig_id in IG_ACCOUNTS.items():
        print(f"\n{unit_id}:")
        media_list = fetch_recent_media(ig_id, token)
        by_shortcode, by_date = index_media(media_list)
        unit_updated = 0

        for month_key in MONTHS_TO_BACKFILL:
            for item_text in get_month_items(text, unit_id, month_key):
                if "image:" in item_text:
                    continue  # ya tiene

                igid_match = re.search(r'igId:\s*"([^"]+)"', item_text)
                media = None
                new_igid = None
                label = None

                if igid_match:
                    shortcode = igid_match.group(1)
                    media = by_shortcode.get(shortcode)
                    label = shortcode
                    if not media:
                        print(f"  [{month_key}] {shortcode}: no se encontro el post (puede ser viejo, fuera de rango)")
                        skipped_not_found += 1
                        continue
                else:
                    if not re.search(r"likes:\s*\d+", item_text):
                        continue  # todavia no esta confirmado como publicado
                    meta_match = re.search(r'meta:\s*"([^"]*)"', item_text)
                    title_match = re.search(r'title:\s*"([^"]*)"', item_text)
                    label = title_match.group(1) if title_match else month_key
                    date_ = parse_meta_date(meta_match.group(1), TRACKED_YEAR) if meta_match else None
                    if not date_:
                        continue
                    candidates = (
                        by_date.get(date_)
                        or by_date.get(date_ - datetime.timedelta(days=1))
                        or by_date.get(date_ + datetime.timedelta(days=1))
                    )
                    if not candidates:
                        continue  # fuera del rango que trae la API, no hay nada para hacer
                    media = candidates[0]
                    new_igid = shortcode_from_permalink(media.get("permalink")) or media.get("id")

                image_url = extract_image_url(media)
                if not image_url:
                    print(f"  [{month_key}] {label}: la API no devolvio una imagen para este post")
                    continue

                print(f"  [{month_key}] {label}: agregando miniatura" + (" + igId (matcheado por fecha)" if new_igid else ""))
                if not dry_run:
                    new_text = item_text[:-2].rstrip() + f', image: "{js_escape(image_url)}"'
                    if new_igid:
                        new_text += f', igId: "{js_escape(new_igid)}"'
                    new_text += " }"
                    text = replace_item(text, item_text, new_text)
                updated += 1
                unit_updated += 1

        if unit_updated == 0:
            print("  (sin novedades)")

    print(f"\nTotal de miniaturas agregadas: {updated}")
    if skipped_not_found:
        print(f"Total de posts no encontrados (fuera de rango de la API): {skipped_not_found}")

    if dry_run:
        print("(--dry-run: no se modifico data.js)")
    elif updated:
        write_data_js(DATA_JS_PATH, text)
        print("data.js actualizado.")
    else:
        print("data.js sin cambios.")


if __name__ == "__main__":
    main()
