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
        "time_limit_sec": 30,
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
        "time_limit_sec": 40,
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
        "time_limit_sec": 40,
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
    
    {
        "name": "Gemini",
        "head_node_id": 0,
        "time_limit_sec": 35,
        "star_nodes": [
            {"id": 0, "label": "Castor",     "x": 0.38, "y": 0.20, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Pollux",     "x": 0.55, "y": 0.22, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Alhena",     "x": 0.58, "y": 0.45, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Wasat",      "x": 0.45, "y": 0.48, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Mebsuta",    "x": 0.32, "y": 0.38, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Tejat",      "x": 0.25, "y": 0.55, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 100, "x": 0.22, "y": 0.30, "hitbox_radius": 0.045},
            {"id": 101, "x": 0.68, "y": 0.32, "hitbox_radius": 0.045},
            {"id": 102, "x": 0.72, "y": 0.62, "hitbox_radius": 0.045},
            {"id": 103, "x": 0.38, "y": 0.70, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Taurus",
        "head_node_id": 0,
        "time_limit_sec": 60,
        "star_nodes": [
            {"id": 0, "label": "Aldebaran", "x": 0.52, "y": 0.48, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Elnath",    "x": 0.38, "y": 0.28, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Tianguan",  "x": 0.62, "y": 0.28, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Ain",       "x": 0.38, "y": 0.55, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Hyadum I",  "x": 0.28, "y": 0.62, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Zeta Tauri","x": 0.72, "y": 0.60, "next_node_id": 6, "hitbox_radius": 0.055},
            {"id": 6, "label": "Alcyone",   "x": 0.58, "y": 0.20, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 104, "x": 0.20, "y": 0.42, "hitbox_radius": 0.045},
            {"id": 105, "x": 0.75, "y": 0.40, "hitbox_radius": 0.045},
            {"id": 106, "x": 0.48, "y": 0.72, "hitbox_radius": 0.045},
            {"id": 107, "x": 0.70, "y": 0.75, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Libra",
        "head_node_id": 0,
        "time_limit_sec": 30,
        "star_nodes": [
            {"id": 0, "label": "Zubeneschamali", "x": 0.50, "y": 0.25, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Zubenelgenubi",  "x": 0.32, "y": 0.45, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Brachium",        "x": 0.42, "y": 0.68, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Zubenelhakrabi",  "x": 0.68, "y": 0.68, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Zubenelakrab",    "x": 0.75, "y": 0.45, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 108, "x": 0.22, "y": 0.25, "hitbox_radius": 0.045},
            {"id": 109, "x": 0.62, "y": 0.38, "hitbox_radius": 0.045},
            {"id": 110, "x": 0.28, "y": 0.72, "hitbox_radius": 0.045},
            {"id": 111, "x": 0.82, "y": 0.25, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Leo",
        "head_node_id": 0,
        "time_limit_sec": 60,
        "star_nodes": [
            {"id": 0, "label": "Regulus",   "x": 0.25, "y": 0.52, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Algieba",   "x": 0.40, "y": 0.38, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Zosma",     "x": 0.58, "y": 0.28, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Chertan",   "x": 0.72, "y": 0.38, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Denebola",  "x": 0.82, "y": 0.52, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Adhafera",  "x": 0.45, "y": 0.22, "next_node_id": 6, "hitbox_radius": 0.055},
            {"id": 6, "label": "Ras Elased", "x": 0.28, "y": 0.30, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 112, "x": 0.20, "y": 0.70, "hitbox_radius": 0.045},
            {"id": 113, "x": 0.50, "y": 0.55, "hitbox_radius": 0.045},
            {"id": 114, "x": 0.65, "y": 0.70, "hitbox_radius": 0.045},
            {"id": 115, "x": 0.80, "y": 0.25, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Scorpius",
        "head_node_id": 0,
        "time_limit_sec": 40,
        "star_nodes": [
            {"id": 0, "label": "Antares",     "x": 0.45, "y": 0.45, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Graffias",    "x": 0.35, "y": 0.28, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Dschubba",    "x": 0.52, "y": 0.22, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Sargas",      "x": 0.62, "y": 0.55, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Shaula",      "x": 0.72, "y": 0.72, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Lesath",      "x": 0.82, "y": 0.68, "next_node_id": 6, "hitbox_radius": 0.055},
            {"id": 6, "label": "Girtab",      "x": 0.74, "y": 0.48, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 116, "x": 0.20, "y": 0.38, "hitbox_radius": 0.045},
            {"id": 117, "x": 0.65, "y": 0.30, "hitbox_radius": 0.045},
            {"id": 118, "x": 0.35, "y": 0.70, "hitbox_radius": 0.045},
            {"id": 119, "x": 0.88, "y": 0.35, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Cassiopeia",
        "head_node_id": 0,
        "time_limit_sec": 40,
        "star_nodes": [
            {"id": 0, "label": "Schedar",   "x": 0.18, "y": 0.42, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Caph",      "x": 0.34, "y": 0.25, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Gamma Cas", "x": 0.50, "y": 0.45, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Ruchbah",   "x": 0.66, "y": 0.25, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Segin",     "x": 0.82, "y": 0.42, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 120, "x": 0.25, "y": 0.65, "hitbox_radius": 0.045},
            {"id": 121, "x": 0.45, "y": 0.70, "hitbox_radius": 0.045},
            {"id": 122, "x": 0.70, "y": 0.65, "hitbox_radius": 0.045},
            {"id": 123, "x": 0.90, "y": 0.55, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Cygnus",
        "head_node_id": 0,
        "time_limit_sec": 30,
        "star_nodes": [
            {"id": 0, "label": "Deneb",      "x": 0.50, "y": 0.18, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Sadr",       "x": 0.50, "y": 0.45, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Albireo",    "x": 0.50, "y": 0.78, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Gienah",     "x": 0.28, "y": 0.48, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Delta Cygni","x": 0.72, "y": 0.48, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 124, "x": 0.25, "y": 0.25, "hitbox_radius": 0.045},
            {"id": 125, "x": 0.75, "y": 0.25, "hitbox_radius": 0.045},
            {"id": 126, "x": 0.25, "y": 0.75, "hitbox_radius": 0.045},
            {"id": 127, "x": 0.78, "y": 0.75, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Ursa Major",
        "head_node_id": 0,
        "time_limit_sec": 50,
        "star_nodes": [
            {"id": 0, "label": "Dubhe",    "x": 0.70, "y": 0.25, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Merak",    "x": 0.68, "y": 0.43, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Phecda",   "x": 0.52, "y": 0.50, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Megrez",   "x": 0.54, "y": 0.34, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Alioth",   "x": 0.42, "y": 0.38, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Mizar",    "x": 0.32, "y": 0.42, "next_node_id": 6, "hitbox_radius": 0.055},
            {"id": 6, "label": "Alkaid",   "x": 0.20, "y": 0.45, "next_node_id": 7, "hitbox_radius": 0.055},
            {"id": 7, "label": "Talitha",  "x": 0.32, "y": 0.62, "next_node_id": 8, "hitbox_radius": 0.055},
            {"id": 8, "label": "Tania",    "x": 0.45, "y": 0.72, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 128, "x": 0.20, "y": 0.25, "hitbox_radius": 0.045},
            {"id": 129, "x": 0.78, "y": 0.60, "hitbox_radius": 0.045},
            {"id": 130, "x": 0.60, "y": 0.75, "hitbox_radius": 0.045},
            {"id": 131, "x": 0.82, "y": 0.35, "hitbox_radius": 0.045},
        ],
    },

    {
        "name": "Canis Major",
        "head_node_id": 0,
        "time_limit_sec": 35,
        "star_nodes": [
            {"id": 0, "label": "Sirius",      "x": 0.48, "y": 0.25, "next_node_id": 1, "hitbox_radius": 0.055},
            {"id": 1, "label": "Mirzam",      "x": 0.30, "y": 0.42, "next_node_id": 2, "hitbox_radius": 0.055},
            {"id": 2, "label": "Muliphein",   "x": 0.62, "y": 0.42, "next_node_id": 3, "hitbox_radius": 0.055},
            {"id": 3, "label": "Wezen",       "x": 0.52, "y": 0.60, "next_node_id": 4, "hitbox_radius": 0.055},
            {"id": 4, "label": "Adhara",      "x": 0.68, "y": 0.72, "next_node_id": 5, "hitbox_radius": 0.055},
            {"id": 5, "label": "Aludra",      "x": 0.35, "y": 0.78, "next_node_id": None, "hitbox_radius": 0.055},
        ],
        "fake_nodes": [
            {"id": 132, "x": 0.18, "y": 0.30, "hitbox_radius": 0.045},
            {"id": 133, "x": 0.78, "y": 0.28, "hitbox_radius": 0.045},
            {"id": 134, "x": 0.25, "y": 0.62, "hitbox_radius": 0.045},
            {"id": 135, "x": 0.82, "y": 0.65, "hitbox_radius": 0.045},
        ],
    }
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
