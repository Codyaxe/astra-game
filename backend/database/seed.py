"""
Seed file — Constellations modeled as Linked-List Structs.
Each star node has:
- id: integer
- label: str (e.g. 'A', 'B', 'Alpha')
- x, y: normalized coords (0.0 to 1.0)
- next_node_id: pointer to the next valid star in the sequence (or None if tail)
- hitbox_radius: extended interactive area beyond visual radius
"""

import json
from database.db import get_connection

CONSTELLATIONS = [
    {
        "name": "Aries",
        "head_node_id": 0,
        "time_limit_sec": 20,
        "star_nodes": [
            {"id": 0, "label": "Hamal (A)",   "x": 0.30, "y": 0.40, "next_node_id": 1,    "hitbox_radius": 0.055},
            {"id": 1, "label": "Sheratan (B)","x": 0.45, "y": 0.35, "next_node_id": 2,    "hitbox_radius": 0.055},
            {"id": 2, "label": "Mesarthim (C)","x": 0.60, "y": 0.38, "next_node_id": 3,   "hitbox_radius": 0.055},
            {"id": 3, "label": "41 Arietis (D)","x": 0.72, "y": 0.44, "next_node_id": None,"hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 100, "x": 0.22, "y": 0.58, "hitbox_radius": 0.045},
            {"id": 101, "x": 0.52, "y": 0.22, "hitbox_radius": 0.045},
            {"id": 102, "x": 0.68, "y": 0.65, "hitbox_radius": 0.045},
            {"id": 103, "x": 0.38, "y": 0.68, "hitbox_radius": 0.045},
        ],
    },
    {
        "name": "Big Dipper",
        "head_node_id": 0,
        "time_limit_sec": 30,
        "star_nodes": [
            {"id": 0, "label": "Alkaid",  "x": 0.20, "y": 0.45, "next_node_id": 1,    "hitbox_radius": 0.055},
            {"id": 1, "label": "Mizar",   "x": 0.32, "y": 0.42, "next_node_id": 2,    "hitbox_radius": 0.055},
            {"id": 2, "label": "Alioth",  "x": 0.42, "y": 0.38, "next_node_id": 3,    "hitbox_radius": 0.055},
            {"id": 3, "label": "Megrez",  "x": 0.54, "y": 0.36, "next_node_id": 4,    "hitbox_radius": 0.055},
            {"id": 4, "label": "Phecda",  "x": 0.52, "y": 0.52, "next_node_id": 5,    "hitbox_radius": 0.055},
            {"id": 5, "label": "Merak",   "x": 0.68, "y": 0.50, "next_node_id": 6,    "hitbox_radius": 0.055},
            {"id": 6, "label": "Dubhe",   "x": 0.70, "y": 0.34, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 104, "x": 0.28, "y": 0.60, "hitbox_radius": 0.045},
            {"id": 105, "x": 0.62, "y": 0.20, "hitbox_radius": 0.045},
            {"id": 106, "x": 0.78, "y": 0.55, "hitbox_radius": 0.045},
        ],
    },
    {
        "name": "Orion",
        "head_node_id": 0,
        "time_limit_sec": 30,
        "star_nodes": [
            {"id": 0, "label": "Betelgeuse","x": 0.35, "y": 0.25, "next_node_id": 1,    "hitbox_radius": 0.055},
            {"id": 1, "label": "Bellatrix", "x": 0.60, "y": 0.23, "next_node_id": 2,    "hitbox_radius": 0.055},
            {"id": 2, "label": "Alnitak",   "x": 0.44, "y": 0.48, "next_node_id": 3,    "hitbox_radius": 0.055},
            {"id": 3, "label": "Alnilam",   "x": 0.48, "y": 0.49, "next_node_id": 4,    "hitbox_radius": 0.055},
            {"id": 4, "label": "Mintaka",   "x": 0.52, "y": 0.50, "next_node_id": 5,    "hitbox_radius": 0.055},
            {"id": 5, "label": "Saiph",     "x": 0.38, "y": 0.72, "next_node_id": 6,    "hitbox_radius": 0.055},
            {"id": 6, "label": "Rigel",     "x": 0.62, "y": 0.70, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 107, "x": 0.20, "y": 0.35, "hitbox_radius": 0.045},
            {"id": 108, "x": 0.75, "y": 0.30, "hitbox_radius": 0.045},
            {"id": 109, "x": 0.50, "y": 0.85, "hitbox_radius": 0.045},
        ],
    },
    {"name": "Gemini", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
    {"name": "Taurus", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
    {"name": "Libra", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
    {"name": "Leo", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
    {"name": "Scorpius", "head_node_id": 0, "time_limit_sec": 30, "star_nodes": [], "fake_nodes": []},
    {"name": "Cassiopeia", "head_node_id": 0, "time_limit_sec": 20, "star_nodes": [], "fake_nodes": []},
    {"name": "Cygnus", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
    {"name": "Ursa Major", "head_node_id": 0, "time_limit_sec": 30, "star_nodes": [], "fake_nodes": []},
    {"name": "Canis Major", "head_node_id": 0, "time_limit_sec": 25, "star_nodes": [], "fake_nodes": []},
]


def seed():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        for c in CONSTELLATIONS:
            cursor.execute(
                """
                INSERT INTO constellations
                    (name, head_node_id, star_nodes_json, fake_nodes_json, time_limit_sec)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    head_node_id    = VALUES(head_node_id),
                    star_nodes_json = VALUES(star_nodes_json),
                    fake_nodes_json = VALUES(fake_nodes_json),
                    time_limit_sec  = VALUES(time_limit_sec)
                """,
                (
                    c["name"],
                    c["head_node_id"],
                    json.dumps(c["star_nodes"]),
                    json.dumps(c["fake_nodes"]),
                    c["time_limit_sec"],
                ),
            )
        conn.commit()
        print(f"Seeded {len(CONSTELLATIONS)} constellations with Linked List struct data.")
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    seed()
