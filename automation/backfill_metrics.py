"""Recorre los items de data.js que ya tienen igId (shortcode) y les
completa shares (y views si son reel/video) si les falta, resolviendo el
media id real de la API a partir del shortcode."""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATA_JS_PATH, IG_ACCOUNTS  # noqa: E402
from sync_instagram import api_get, fetch_shares, fetch_video_views  # noqa: E402
from exchange_token import ENV_PATH, load_env  # noqa: E402
from data_js_editor import read_data_js, write_data_js  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def resolve_media_id(ig_id, shortcode, token):
    data = api_get(f"{ig_id}/media", token, fields="id,media_type,permalink", limit=50)
    for m in data.get("data", []):
        if shortcode in (m.get("permalink") or ""):
            return m["id"], m.get("media_type")
    return None, None


def main():
    env = load_env(ENV_PATH)
    token = os.environ.get("IG_LONG_LIVED_TOKEN") or env.get("IG_LONG_LIVED_TOKEN")
    if not token:
        print("Falta el token.")
        return

    text = read_data_js(DATA_JS_PATH)
    updated = 0

    for item_match in re.finditer(r"\{[^{}]*igId:\s*\"([^\"]+)\"[^{}]*\}", text):
        item_text = item_match.group(0)
        shortcode = item_match.group(1)
        if "shares:" in item_text:
            continue  # ya tiene el dato

        # buscamos a que unidad pertenece mirando hacia atras en el texto
        preceding = text[: item_match.start()]
        unit_ids_found = re.findall(r'id: "([a-z0-9-]+)"', preceding)
        if not unit_ids_found:
            continue
        unit_id = unit_ids_found[-1]
        ig_id = IG_ACCOUNTS.get(unit_id)
        if not ig_id:
            continue

        media_id, media_type = resolve_media_id(ig_id, shortcode, token)
        if not media_id:
            print(f"  {unit_id} / {shortcode}: no se encontro el post (puede ser viejo, fuera de rango)")
            continue

        shares = fetch_shares(media_id, token)
        new_item_text = item_text
        if shares is not None:
            new_item_text = new_item_text[:-2] + f", shares: {shares} }}"

        if media_type == "VIDEO" and "views:" not in item_text:
            views = fetch_video_views(media_id, token)
            if views is not None:
                new_item_text = new_item_text[:-2] + f", views: {views} }}"

        if new_item_text != item_text:
            text = text.replace(item_text, new_item_text, 1)
            updated += 1
            print(f"  {unit_id} / {shortcode}: actualizado (shares={shares})")

    if updated:
        write_data_js(DATA_JS_PATH, text)
        print(f"\n{updated} item(s) actualizados en data.js")
    else:
        print("Nada para actualizar.")


if __name__ == "__main__":
    main()
