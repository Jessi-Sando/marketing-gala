"""Constantes y utilidades compartidas por los scripts de automatizacion."""

import datetime
import os
import re

IG_ACCOUNTS = {
    "casino-gala": "17841407924575941",
    "valentino-restaurant": "17841404917488271",
    "resto-ruta-11": "17841460123883212",
    "amerian-hotel": "17841405002028189",
    "gala-hotel-convenciones": "17841404980365862",
    "gala-recepciones": "17841478182049079",
}

# Pagina de Facebook vinculada a cada cuenta de Instagram (resuelto una vez via
# GET /me/accounts, cruzando por instagram_business_account.id).
FB_PAGES = {
    "casino-gala": "552980788076666",
    "valentino-restaurant": "1688104454804654",
    "resto-ruta-11": "114210835030746",
    "amerian-hotel": "138987339506328",
    "gala-hotel-convenciones": "282617875222553",
    "gala-recepciones": "870129206190356",
}

MONTH_ABBR_ES = {6: "jun", 7: "jul", 8: "ago", 9: "sep"}
MONTH_KEY_ES = {6: "junio", 7: "julio", 8: "agosto", 9: "septiembre"}

MONTH_ABBR_TO_NUM = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6,
    "jul": 7, "ago": 8, "sep": 9, "oct": 10, "nov": 11, "dic": 12,
}
_DAY_MONTH_RE = re.compile(
    r"^(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)", re.IGNORECASE
)

DATA_JS_PATH = os.path.join(os.path.dirname(__file__), "..", "data.js")

EMOJI_RE = re.compile(
    "["
    "\U0001F300-\U0001FAFF"
    "\U00002600-\U000027BF"
    "\U0001F1E6-\U0001F1FF"
    "]+",
    flags=re.UNICODE,
)


def shortcode_from_permalink(permalink):
    if not permalink:
        return None
    match = re.search(r"/(?:p|reel)/([^/]+)/?", permalink)
    return match.group(1) if match else None


def classify_format(media_type):
    if media_type == "CAROUSEL_ALBUM":
        return "carrusel"
    if media_type == "VIDEO":
        return "reel"
    return "flyer"


def format_date_meta(dt):
    return f"{dt.day} {MONTH_ABBR_ES.get(dt.month, dt.strftime('%b').lower())}"


def month_key_for(dt):
    return MONTH_KEY_ES.get(dt.month)


def extract_day_month(meta):
    """Extrae el 'D mon' inicial de un texto de meta libre (ej. '7 jul ·
    Sala Barranqueras' -> '7 jul'), ignorando cualquier sufijo. Devuelve None
    si el texto no empieza con una fecha reconocible (ej. 'Todo julio',
    'Fecha a confirmar', '')."""
    match = _DAY_MONTH_RE.match(meta.strip())
    if not match:
        return None
    return f"{int(match.group(1))} {match.group(2).lower()}"


def parse_meta_date(meta, year):
    """Devuelve un datetime.date a partir de un texto de meta libre, o None
    si no tiene una fecha 'D mon' reconocible al principio."""
    match = _DAY_MONTH_RE.match(meta.strip())
    if not match:
        return None
    month = MONTH_ABBR_TO_NUM.get(match.group(2).lower())
    if not month:
        return None
    try:
        return datetime.date(year, month, int(match.group(1)))
    except ValueError:
        return None


def derive_title(caption):
    if not caption:
        return "Publicacion sin caption"
    first_line = caption.strip().split("\n")[0]
    cleaned = EMOJI_RE.sub("", first_line).strip(" -—·")
    if not cleaned:
        cleaned = caption.strip().split("\n")[0].strip()
    if len(cleaned) > 70:
        cleaned = cleaned[:67].rstrip() + "..."
    return cleaned or "Publicacion auto-detectada"


def derive_desc(caption, title):
    if not caption:
        return ""
    remainder = caption.strip()
    if remainder.startswith(title):
        remainder = remainder[len(title):]
    remainder = " ".join(remainder.split())
    if len(remainder) > 140:
        remainder = remainder[:137].rstrip() + "..."
    return remainder


def js_escape(text):
    return text.replace("\\", "\\\\").replace('"', '\\"')
