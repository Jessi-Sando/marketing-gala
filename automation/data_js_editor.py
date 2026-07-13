"""Lee y edita data.js con manipulacion de texto (no es JSON, es JS), buscando
bloques por unidad y por mes. Evita parsear todo el JS: solo ubica
`id: "unit-id"` y luego `monthKey: [` dentro de ese bloque."""

import re


def read_data_js(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write_data_js(path, text):
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def _unit_block_bounds(text, unit_id):
    marker = f'id: "{unit_id}"'
    start = text.find(marker)
    if start == -1:
        raise ValueError(f"No se encontro la unidad '{unit_id}' en data.js")
    next_unit = re.search(r'id: "[a-z0-9-]+"', text[start + len(marker):])
    end = start + len(marker) + next_unit.start() if next_unit else len(text)
    return start, end


def _month_array_insert_point(text, unit_start, unit_end, month_key):
    marker = re.search(rf"\b{re.escape(month_key)}\s*:\s*\[", text[unit_start:unit_end])
    if not marker:
        raise ValueError(f"No se encontro '{month_key}: [' en el bloque de la unidad")
    return unit_start + marker.end()


def _matching_close_bracket(text, open_index):
    """open_index apunta justo despues del '[' de apertura. Cuenta
    profundidad de corchetes para encontrar el ']' que realmente cierra
    ese array, sin confundirse con los 'tags: [...]' anidados de cada item."""
    depth = 1
    i = open_index
    while depth > 0:
        ch = text[i]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
        i += 1
    return i - 1


def _split_items(block):
    """Separa el contenido de un array de items en los textos de cada
    objeto { ... } de nivel superior (cuenta solo llaves, ya que las tags
    son arrays [...] que no contienen llaves anidadas)."""
    items = []
    depth = 0
    current_start = None
    for i, ch in enumerate(block):
        if ch == "{":
            if depth == 0:
                current_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and current_start is not None:
                items.append(block[current_start:i + 1])
                current_start = None
    return items


def extract_tracked_signatures(text, unit_id, month_key):
    """Devuelve (igids_vistos, fechas_de_items_sin_igid) para ese mes.
    Los items que ya tienen igId solo se chequean por igId (para permitir
    varias publicaciones reales el mismo dia); los items viejos cargados a
    mano (sin igId) se chequean por fecha, como respaldo."""
    unit_start, unit_end = _unit_block_bounds(text, unit_id)
    insert_at = _month_array_insert_point(text, unit_start, unit_end, month_key)
    close_bracket = _matching_close_bracket(text, insert_at)
    block = text[insert_at:close_bracket]

    igids = set()
    legacy_dates = set()
    for item_text in _split_items(block):
        ig_match = re.search(r'igId:\s*"([^"]*)"', item_text)
        if ig_match:
            igids.add(ig_match.group(1).strip())
            continue
        meta_match = re.search(r'meta:\s*"([^"]*)"', item_text)
        if meta_match and meta_match.group(1).strip():
            legacy_dates.add(meta_match.group(1).strip())
    return igids, legacy_dates


def insert_item(text, unit_id, month_key, item_js_text):
    """Inserta item_js_text como primer elemento del array del mes indicado."""
    unit_start, unit_end = _unit_block_bounds(text, unit_id)
    insert_at = _month_array_insert_point(text, unit_start, unit_end, month_key)

    remainder = text[insert_at:]
    stripped = remainder.lstrip()
    is_empty_array = stripped.startswith("]")

    if is_empty_array:
        insertion = f"\n        {item_js_text}\n      "
    else:
        insertion = f"\n        {item_js_text},"

    return text[:insert_at] + insertion + text[insert_at:]


def _performance_history_insert_point(text, unit_start, unit_end):
    marker = re.search(r"performance:\s*\{\s*history:\s*\[", text[unit_start:unit_end])
    if not marker:
        raise ValueError(f"No se encontro 'performance: {{ history: [' en la unidad")
    return unit_start + marker.end()


def upsert_performance_day(text, unit_id, date_str, day_js_text):
    """Reemplaza la entrada de performance.history con ese 'date' si ya existe
    (permite reintentos el mismo dia); si no existe, la agrega al final (orden
    cronologico ascendente, mas simple para graficar)."""
    unit_start, unit_end = _unit_block_bounds(text, unit_id)
    insert_at = _performance_history_insert_point(text, unit_start, unit_end)
    close_bracket = _matching_close_bracket(text, insert_at)
    block = text[insert_at:close_bracket]

    items = _split_items(block)
    replaced = False
    new_items = []
    for item_text in items:
        date_match = re.search(r'date:\s*"([^"]*)"', item_text)
        if date_match and date_match.group(1) == date_str:
            new_items.append(day_js_text)
            replaced = True
        else:
            new_items.append(item_text)
    if not replaced:
        new_items.append(day_js_text)

    inner = ",\n        ".join(new_items)
    new_block = f"\n        {inner}\n      "
    return text[:insert_at] + new_block + text[close_bracket:]
