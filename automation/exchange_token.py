"""Intercambia el token corto del Explorador de la API Graph por uno de larga
duracion (~60 dias). Lee y escribe solo en automation/.env (nunca imprime el
valor de los tokens ni del secreto por seguridad)."""

import json
import os
import urllib.error
import urllib.parse
import urllib.request

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")


EXPECTED_KEYS = ["FB_APP_ID", "FB_APP_SECRET", "FB_SHORT_LIVED_TOKEN", "IG_LONG_LIVED_TOKEN"]


def load_env(path):
    """Tolerante a pegados problematicos: si una linea 'CLAVE=' queda vacia,
    toma el valor de la linea siguiente. Si una linea es un valor 'huerfano'
    (sin 'CLAVE=' adelante), se lo asigna a la primera clave esperada que
    todavia no tenga valor."""
    env = {}
    if not os.path.exists(path):
        return env
    pending_key = None
    orphan_values = []
    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        for raw_line in f:
            stripped = raw_line.strip()
            if not stripped or stripped.startswith("#"):
                pending_key = None
                continue
            key_part = stripped.split("=", 1)[0].strip()
            if "=" in stripped and key_part and " " not in key_part:
                key, _, value = stripped.partition("=")
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if value:
                    env[key] = value
                    pending_key = None
                else:
                    pending_key = key
            elif pending_key:
                env[pending_key] = (env.get(pending_key, "") + stripped).strip()
                pending_key = None
            else:
                orphan_values.append(stripped)

    for value in orphan_values:
        missing_key = next((k for k in EXPECTED_KEYS if k not in env), None)
        if missing_key:
            env[missing_key] = value

    return env


def save_env_value(path, key, value):
    lines = []
    found = False
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith(key + "="):
                    lines.append(f"{key}={value}\n")
                    found = True
                else:
                    lines.append(line)
    if not found:
        lines.append(f"{key}={value}\n")
    with open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def main():
    env = load_env(ENV_PATH)
    app_id = env.get("FB_APP_ID")
    app_secret = env.get("FB_APP_SECRET")
    short_token = env.get("FB_SHORT_LIVED_TOKEN")

    missing = [k for k, v in [("FB_APP_ID", app_id), ("FB_APP_SECRET", app_secret), ("FB_SHORT_LIVED_TOKEN", short_token)] if not v]
    if missing:
        print("Faltan estas claves en automation/.env: " + ", ".join(missing))
        return

    params = urllib.parse.urlencode({
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": short_token,
    })
    url = f"https://graph.facebook.com/v21.0/oauth/access_token?{params}"

    try:
        with urllib.request.urlopen(url) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print("Meta devolvio un error (no se expone el token ni el secreto):")
        print(body)
        return

    long_token = data.get("access_token")
    expires_in = data.get("expires_in")

    if not long_token:
        print("No se recibio token de acceso en la respuesta.")
        return

    save_env_value(ENV_PATH, "IG_LONG_LIVED_TOKEN", long_token)
    dias = round(expires_in / 86400) if expires_in else "desconocidos"
    print(f"Listo. Token de larga duracion guardado en automation/.env (dura ~{dias} dias).")
    print("El valor no se muestra en pantalla por seguridad.")


if __name__ == "__main__":
    main()
