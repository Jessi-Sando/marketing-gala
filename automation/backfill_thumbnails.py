"""Agrega la foto/miniatura real de Instagram a los items de junio y julio
que ya estan matcheados con un post real (tienen igId) pero todavia no
tienen guardado el link de la imagen. No descarga el archivo: guarda el
link que entrega Instagram tal cual (puede vencer con el tiempo).

Uso:
  python backfill_thumbnails.py            -> aplica los cambios a data.js
  python backfill_thumbnails.py --dry-run  -> solo muestra que actualizaria
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import DATA_JS_PATH, IG_ACCOUNTS, js_escape  # noqa: E402
from data_js_editor import get_month_items, read_data_js, replace_item, write_data_js  # noqa: E402
from exchange_token import ENV_PATH, load_env  # noqa: E402
from sync_instagram import api_get, extract_image_url  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MONTHS_TO_BACKFILL = ["junio", "julio"]
MEDIA_FIELDS = "id,media_type,permalink,media_url,thumbnail_url,children{media_url}"


def get_token():
    token = os.environ.get("IG_LONG_LIVED_TOKEN")
    if token:
        return token
    env = load_env(ENV_PATH)
    return env.get("IG_LONG_LIVED_TOKEN")


def find_media_by_shortcode(ig_id, shortcode, token):
    data = api_get(f"{ig_id}/media", token, fields=MEDIA_FIELDS, limit=50)
    for m in data.get("data", []):
        if shortcode in (m.get("permalink") or ""):
            return m
    return None


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
        unit_updated = 0
        for month_key in MONTHS_TO_BACKFILL:
            for item_text in get_month_items(text, unit_id, month_key):
                match = re.search(r'igId:\s*"([^"]+)"', item_text)
                if not match:
                    continue  # nunca se publico de verdad, no hay foto que buscar
                if "image:" in item_text:
                    continue  # ya tiene

                shortcode = match.group(1)
                media = find_media_by_shortcode(ig_id, shortcode, token)
                if not media:
                    print(f"  [{month_key}] {shortcode}: no se encontro el post (puede ser viejo, fuera de rango)")
                    skipped_not_found += 1
                    continue

                image_url = extract_image_url(media)
                if not image_url:
                    print(f"  [{month_key}] {shortcode}: la API no devolvio una imagen para este post")
                    continue

                print(f"  [{month_key}] {shortcode}: agregando miniatura")
                if not dry_run:
                    new_text = item_text[:-2].rstrip() + f', image: "{js_escape(image_url)}" }}'
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
