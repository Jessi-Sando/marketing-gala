"""Barre el calendario de una unidad buscando items planificados a mano cuya
fecha ya paso y que nunca se enriquecieron con un post real (eso lo intenta
primero sync_instagram.py). No los borra: les agrega el tag
'planificado, no publicado' y los mueve al final de la lista de su mes.

Es idempotente: correrlo varios dias seguidos sobre el mismo item ya marcado
no le duplica el tag ni lo reordena de mas.
"""

import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import MONTH_ABBR_TO_NUM, parse_meta_date  # noqa: E402
from data_js_editor import get_month_items, replace_month_items  # noqa: E402

TRACKED_YEAR = 2026
MONTH_ORDER = ["junio", "julio", "agosto", "septiembre"]
OVERDUE_TAG = "planificado, no publicado"


def _today_argentina():
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    return (now_utc - datetime.timedelta(hours=3)).date()


def _item_date(item_text):
    meta_match = re.search(r'meta:\s*"([^"]*)"', item_text)
    if not meta_match or not meta_match.group(1).strip():
        return None
    return parse_meta_date(meta_match.group(1), TRACKED_YEAR)


def _published_dates(items):
    """Fechas (con +-1 dia de tolerancia) de items del mes que YA tienen
    datos reales (likes), para no marcar como 'no publicado' un item
    planificado que en realidad ya se publico bajo otro item (ej. un
    duplicado viejo insertado antes de que existiera el enriquecido
    automatico)."""
    dates = set()
    for item_text in items:
        if not re.search(r"\blikes:\s*\d", item_text):
            continue
        date = _item_date(item_text)
        if date:
            dates.add(date)
    return dates


def _is_date_range(meta):
    """Los rangos tipo '28 jun-7 jul' o '1-7 ago' describen una ventana de
    campana (varios posts posibles), no una publicacion puntual verificable
    -> nunca se marcan como 'no publicado' automaticamente."""
    return "–" in meta or "-" in meta


def _is_overdue_unpublished(item_text, today, published_dates):
    if re.search(r"\blikes:\s*\d", item_text):
        return False
    meta_match = re.search(r'meta:\s*"([^"]*)"', item_text)
    if meta_match and _is_date_range(meta_match.group(1)):
        return False
    date = _item_date(item_text)
    if not date:
        return False
    if date >= today:
        return False
    nearby_published = any(abs((date - pub).days) <= 1 for pub in published_dates)
    if nearby_published:
        return False
    return True


def _is_flagged(item_text):
    tags_match = re.search(r"tags:\s*\[([^\]]*)\]", item_text)
    if not tags_match:
        return False
    return OVERDUE_TAG in tags_match.group(1)


def _add_overdue_tag(item_text):
    return re.sub(r"tags:\s*\[", f'tags: ["{OVERDUE_TAG}", ', item_text, count=1)


_LENIENT_DATE_RE = re.compile(
    r"(\d{1,2}).*?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)", re.IGNORECASE
)


def _lenient_date_for_sort(meta):
    """Para ordenar (no para decidir si algo esta 'vencido'): a diferencia de
    parse_meta_date, esto tambien entiende rangos como '1-17 jul' o
    '28 jun-7 jul', tomando el primer numero de dia y el primer mes que
    encuentra como fecha de inicio aproximada."""
    match = _LENIENT_DATE_RE.search(meta.strip())
    if not match:
        return None
    month = MONTH_ABBR_TO_NUM.get(match.group(2).lower())
    if not month:
        return None
    try:
        return datetime.date(TRACKED_YEAR, month, int(match.group(1)))
    except ValueError:
        return None


def _sort_key(item_text):
    """Los items sin ninguna fecha reconocible (ej. 'Todo julio', placeholders
    'pendiente') quedan al final de su grupo, pero mantienen su orden
    relativo original entre si (sort estable)."""
    meta_match = re.search(r'meta:\s*"([^"]*)"', item_text)
    meta = meta_match.group(1) if meta_match else ""
    date = _lenient_date_for_sort(meta) if meta else None
    return date or datetime.date.max


def reconcile_month(text, unit_id, month_key, today, dry_run):
    items = get_month_items(text, unit_id, month_key)
    published_dates = _published_dates(items)
    keep = []
    flagged_items = []
    newly_flagged = 0

    for item_text in items:
        overdue = _is_overdue_unpublished(item_text, today, published_dates)
        already_flagged = _is_flagged(item_text)
        if overdue or already_flagged:
            if overdue and not already_flagged:
                title_match = re.search(r'title:\s*"([^"]*)"', item_text)
                print(f"    ⏳ [{month_key}] {title_match.group(1) if title_match else '(sin titulo)'}")
                item_text = _add_overdue_tag(item_text)
                newly_flagged += 1
            flagged_items.append(item_text)
        else:
            keep.append(item_text)

    keep.sort(key=_sort_key)
    flagged_items.sort(key=_sort_key)

    new_items = keep + flagged_items
    if new_items == items:
        return text, newly_flagged

    if not dry_run:
        text = replace_month_items(text, unit_id, month_key, new_items)
    return text, newly_flagged


def reconcile_unit(text, unit_id, dry_run=False):
    today = _today_argentina()
    total_flagged = 0
    for month_key in MONTH_ORDER:
        text, flagged = reconcile_month(text, unit_id, month_key, today, dry_run)
        total_flagged += flagged
    return text, total_flagged
