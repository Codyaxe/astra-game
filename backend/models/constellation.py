"""
Constellation model — Linked-list struct parsing and traversal helpers.
"""

import json
from database.db import execute


def get_all() -> list[dict]:
    rows = execute("SELECT * FROM constellations ORDER BY id")
    return [_parse_row(r) for r in rows]


def get_by_id(constellation_id: int) -> dict | None:
    rows = execute("SELECT * FROM constellations WHERE id = %s", (constellation_id,))
    return _parse_row(rows[0]) if rows else None


def validate_connection(constellation_id: int, from_node_id: int, to_node_id: int) -> bool:
    """
    Validate whether to_node_id is the valid expected linked next node for from_node_id.
    """
    c = get_by_id(constellation_id)
    if not c:
        return False

    nodes_map = {n["id"]: n for n in c["star_nodes"]}
    current_node = nodes_map.get(from_node_id)
    if not current_node:
        return False

    return current_node.get("next_node_id") == to_node_id


def _parse_row(row) -> dict:
    d = dict(row)
    d["star_nodes"] = json.loads(d.pop("star_nodes_json", "[]"))
    d["fake_nodes"] = json.loads(d.pop("fake_nodes_json", "[]"))
    return d
