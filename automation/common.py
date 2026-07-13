"""Constantes y utilidades compartidas por los scripts de automatizacion."""

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
