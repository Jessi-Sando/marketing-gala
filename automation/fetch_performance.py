"""Trae metricas organicas de cuenta (Instagram + Facebook) para el dia de
ayer (hora Argentina) de cada unidad, y las guarda como un snapshot diario en
data.js (UNITS[i].performance.history), para alimentar el panel de
Rendimiento del dashboard.

No incluye desglose pago/organico (eso requiere la API de Marketing de Meta,
fuera de alcance por ahora). Se corre una vez por dia junto a sync_instagram.py.

Uso:
  python fetch_performance.py            -> aplica los cambios a data.js
  python fetch_performance.py --dry-run  -> solo muestra los valores, no toca nada
"""

import datetime
import json
import re
import sys
import os
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from common import DATA_JS_PATH, FB_PAGES, IG_ACCOUNTS  # noqa: E402
from data_js_editor import (  # noqa: E402
    _matching_close_bracket,
    _performance_history_insert_point,
    _split_items,
    _unit_block_bounds,
    read_data_js,
    upsert_performance_day,
    write_data_js,
)
from exchange_token import ENV_PATH, load_env  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GRAPH_VERSION = "v21.0"

# Metricas de serie diaria (period=day, un solo valor por dia dentro del rango)
IG_TIME_SERIES_METRICS = ["reach"]

# Metricas que requieren metric_type=total_value (agregan todo el rango since/until)
IG_TOTAL_VALUE_METRICS = [
    "views",
    "likes",
    "comments",
    "shares",
    "saves",
    "total_interactions",
    "profile_views",
]


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


def yesterday_range_argentina():
    """Devuelve (date_str, since_epoch, until_epoch) para el dia de ayer,
    hora Argentina (UTC-3), en timestamps UTC para la API de Meta."""
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    now_arg = now_utc - datetime.timedelta(hours=3)
    yesterday_arg = (now_arg - datetime.timedelta(days=1)).date()
    start_arg = datetime.datetime.combine(yesterday_arg, datetime.time.min)
    start_utc = start_arg + datetime.timedelta(hours=3)
    end_utc = start_utc + datetime.timedelta(days=1)
    return yesterday_arg.isoformat(), int(start_utc.timestamp()), int(end_utc.timestamp())


def fetch_ig_time_series(ig_id, token, metric, since, until):
    try:
        data = api_get(f"{ig_id}/insights", token, metric=metric, period="day", since=since, until=until)
        values = data.get("data", [{}])[0].get("values", [])
        return values[0]["value"] if values else None
    except (urllib.error.HTTPError, IndexError, KeyError):
        return None


def fetch_ig_total_value(ig_id, token, metric, since, until):
    try:
        data = api_get(
            f"{ig_id}/insights", token, metric=metric, period="day",
            metric_type="total_value", since=since, until=until,
        )
        return data.get("data", [{}])[0].get("total_value", {}).get("value")
    except (urllib.error.HTTPError, IndexError, KeyError):
        return None


def fetch_fb_followers(page_id, token):
    if not page_id:
        return None
    try:
        data = api_get(page_id, token, fields="followers_count")
        return data.get("followers_count")
    except urllib.error.HTTPError:
        return None


def get_page_access_tokens(user_token):
    """Resuelve una vez por corrida los access token de cada pagina de
    Facebook administrada (necesarios para leer los posts de la pagina),
    via /me/accounts."""
    try:
        data = api_get("me/accounts", user_token, fields="id,access_token", limit=100)
        return {p["id"]: p["access_token"] for p in data.get("data", []) if p.get("access_token")}
    except (urllib.error.HTTPError, KeyError):
        return {}


def fetch_fb_page_interactions(page_id, page_token, since, until):
    """Suma likes + comentarios + compartidos de los posts de la pagina de
    Facebook publicados en el rango de fechas. Usa los campos clasicos del
    post (likes/comments/shares) en vez del sistema de Page Insights, que
    Meta viene deprecando por partes (page_post_engagements ya no devuelve
    datos)."""
    if not page_id or not page_token:
        return None
    try:
        data = api_get(
            f"{page_id}/posts", page_token,
            fields="likes.summary(true),comments.summary(true),shares",
            since=since, until=until, limit=100,
        )
    except urllib.error.HTTPError:
        return None
    total = 0
    for post in data.get("data", []):
        total += (post.get("likes") or {}).get("summary", {}).get("total_count", 0) or 0
        total += (post.get("comments") or {}).get("summary", {}).get("total_count", 0) or 0
        total += (post.get("shares") or {}).get("count", 0) or 0
    return total


def fetch_ig_followers(ig_id, token):
    """Total de seguidores actual (snapshot, no serie historica). El metric
    'follower_count' de insights no es un total sino altas/bajas del dia."""
    try:
        data = api_get(ig_id, token, fields="followers_count")
        return data.get("followers_count")
    except urllib.error.HTTPError:
        return None


def get_last_followers(text, unit_id):
    """Lee el ultimo 'followers' guardado en performance.history de la unidad
    (para calcular el crecimiento neto del dia)."""
    try:
        unit_start, unit_end = _unit_block_bounds(text, unit_id)
        insert_at = _performance_history_insert_point(text, unit_start, unit_end)
        close_bracket = _matching_close_bracket(text, insert_at)
        block = text[insert_at:close_bracket]
        items = _split_items(block)
        if not items:
            return None
        match = re.search(r"followers:\s*(\d+)", items[-1])
        return int(match.group(1)) if match else None
    except ValueError:
        return None


def format_performance_js(entry):
    parts = [f'date: "{entry["date"]}"']
    for key in ["views", "likes", "comments", "shares", "saves", "interactions", "reach", "profileViews", "followers", "followersDelta", "fbFollowers", "fbInteractions"]:
        value = entry.get(key)
        if value is not None:
            parts.append(f"{key}: {value}")
    return "{ " + ", ".join(parts) + " }"


def process_unit(unit_id, ig_id, token, text, date_str, since, until, dry_run, page_access_tokens):
    page_id = FB_PAGES.get(unit_id)
    page_token = page_access_tokens.get(page_id)

    reach = fetch_ig_time_series(ig_id, token, "reach", since, until)
    followers = fetch_ig_followers(ig_id, token)

    views = fetch_ig_total_value(ig_id, token, "views", since, until)
    likes = fetch_ig_total_value(ig_id, token, "likes", since, until)
    comments = fetch_ig_total_value(ig_id, token, "comments", since, until)
    shares = fetch_ig_total_value(ig_id, token, "shares", since, until)
    saves = fetch_ig_total_value(ig_id, token, "saves", since, until)
    interactions = fetch_ig_total_value(ig_id, token, "total_interactions", since, until)
    profile_views = fetch_ig_total_value(ig_id, token, "profile_views", since, until)

    fb_followers = fetch_fb_followers(page_id, token)
    fb_interactions = fetch_fb_page_interactions(page_id, page_token, since, until)

    last_followers = get_last_followers(text, unit_id)
    followers_delta = (followers - last_followers) if (followers is not None and last_followers is not None) else None

    entry = {
        "date": date_str,
        "views": views,
        "likes": likes,
        "comments": comments,
        "shares": shares,
        "saves": saves,
        "interactions": interactions,
        "reach": reach,
        "profileViews": profile_views,
        "followers": followers,
        "followersDelta": followers_delta,
        "fbFollowers": fb_followers,
        "fbInteractions": fb_interactions,
    }

    print(f"  {unit_id}: views={views} interactions={interactions} reach={reach} followers={followers} (Δ{followers_delta}) fbFollowers={fb_followers} fbInteractions={fb_interactions}")

    if dry_run:
        return text

    day_js = format_performance_js(entry)
    return upsert_performance_day(text, unit_id, date_str, day_js)


def main():
    dry_run = "--dry-run" in sys.argv
    token = get_token()
    if not token:
        print("Falta IG_LONG_LIVED_TOKEN (variable de entorno o automation/.env).")
        return

    date_str, since, until = yesterday_range_argentina()
    print(f"Trayendo rendimiento del {date_str} (hora Argentina)...\n")

    text = read_data_js(DATA_JS_PATH)
    page_access_tokens = get_page_access_tokens(token)

    for unit_id, ig_id in IG_ACCOUNTS.items():
        text = process_unit(unit_id, ig_id, token, text, date_str, since, until, dry_run, page_access_tokens)

    if dry_run:
        print("\n(--dry-run: no se modifico data.js)")
    else:
        write_data_js(DATA_JS_PATH, text)
        print("\ndata.js actualizado con el rendimiento del dia.")


if __name__ == "__main__":
    main()
