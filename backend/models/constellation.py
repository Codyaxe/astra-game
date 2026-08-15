"""
Constellation model — Linked-list struct parsing and traversal helpers.

Database:
    MySQL / mysql.connector

Table:
    constellations
"""

import json
from database.db import get_connection


def get_all() -> list[dict]:
    """
    Retrieve all constellations.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM constellations
            ORDER BY id
            """
        )

        rows = cursor.fetchall()
        return [_parse_row(row) for row in rows]

    finally:
        cursor.close()
        conn.close()


def get_by_id(constellation_id: int) -> dict | None:
    """
    Retrieve a constellation by its ID.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM constellations
            WHERE id = %s
            """,
            (constellation_id,),
        )

        row = cursor.fetchone()
        return _parse_row(row) if row else None

    finally:
        cursor.close()
        conn.close()


def validate_connection(
    constellation_id: int,
    from_node_id: int,
    to_node_id: int,
) -> bool:
    """
    Validate whether to_node_id is the expected next node
    for from_node_id in the given constellation.
    """

    constellation = get_by_id(constellation_id)

    if not constellation:
        return False

    nodes_map = {
        node["id"]: node
        for node in constellation["star_nodes"]
    }

    current_node = nodes_map.get(from_node_id)

    if not current_node:
        return False

    return current_node.get("next_node_id") == to_node_id


def _parse_row(row) -> dict:
    """
    Convert a MySQL dictionary row into the structure expected
    by the rest of the application.
    """

    data = dict(row)

    data["star_nodes"] = json.loads(
        data.pop("star_nodes_json", "[]")
    )

    data["fake_nodes"] = json.loads(
        data.pop("fake_nodes_json", "[]")
    )

    return data