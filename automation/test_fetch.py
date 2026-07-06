"""Prueba rapida: trae los ultimos posts de una cuenta de Instagram usando el
token de larga duracion guardado en .env. Solo para verificar que la conexion
funciona antes de construir la automatizacion completa."""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(__file__))
from exchange_token import load_env, ENV_PATH  # noqa: E402

IG_ACCOUNTS = {
    "casino-gala": "17841407924575941",
    "valentino-restaurant": "17841404917488271",
    "resto-ruta-11": "17841460123883212",
    "amerian-hotel": "17841405002028189",
    "gala-hotel-convenciones": "17841404980365862",
    "gala-recepciones": "17841478182049079",
}


def main():
    env = load_env(ENV_PATH)
    token = env.get("IG_LONG_LIVED_TOKEN")
    if not token:
        print("Falta IG_LONG_LIVED_TOKEN en .env. Corre exchange_token.py primero.")
        return

    unit_key = sys.argv[1] if len(sys.argv) > 1 else "casino-gala"
    ig_id = IG_ACCOUNTS.get(unit_key)
    if not ig_id:
        print("Unidad desconocida. Opciones: " + ", ".join(IG_ACCOUNTS))
        return

    fields = "id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink"
    params = urllib.parse.urlencode({"fields": fields, "access_token": token, "limit": 5})
    url = f"https://graph.facebook.com/v21.0/{ig_id}/media?{params}"

    try:
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("Error de Meta:")
        print(e.read().decode("utf-8"))
        return

    posts = data.get("data", [])
    print(f"Se encontraron {len(posts)} posts recientes de '{unit_key}':\n")
    for p in posts:
        print(f"- [{p.get('media_type')} / {p.get('media_product_type')}] {p.get('timestamp')}")
        print(f"  Likes: {p.get('like_count')} | Comentarios: {p.get('comments_count')}")
        caption = (p.get("caption") or "").replace("\n", " ")
        print(f"  Caption: {caption[:80]}")
        print(f"  Link: {p.get('permalink')}\n")


if __name__ == "__main__":
    main()
