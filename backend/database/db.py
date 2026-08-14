"""
SQLite schema and database connection helper.
Updated for:
- 3 Attempts tracking & best-score retention
- Struct-based / Linked-list Constellation representation
- OCR and Mobile-QR registration fallback
"""

import sqlite3
from config import Config

_DB_PATH = Config.SQLITE_DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


SCHEMA_SQL = """
-- Players registered via OCR or Mobile QR Fallback
CREATE TABLE IF NOT EXISTS players (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name          TEXT    NOT NULL,
    last_name           TEXT    NOT NULL,
    sr_code             TEXT    NOT NULL UNIQUE,
    course              TEXT    NOT NULL,
    contact_number      TEXT,
    registration_source TEXT    DEFAULT 'ocr',      -- 'ocr' | 'mobile_qr'
    id_picture_path     TEXT,
    qr_ticket_code      TEXT    UNIQUE,             -- token encoded in QR ticket
    total_attempts_used INTEGER DEFAULT 0,          -- max 3
    best_score          REAL    DEFAULT 0,          -- highest retained score
    created_at          TEXT    DEFAULT (datetime('now'))
);

-- Constellations (Linked-List star definitions)
CREATE TABLE IF NOT EXISTS constellations (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL UNIQUE,
    head_node_id        INTEGER NOT NULL,
    star_nodes_json     TEXT    NOT NULL DEFAULT '[]',   -- Linked struct nodes: [{id, label, x, y, next_node_id, hitbox_radius}]
    fake_nodes_json     TEXT    NOT NULL DEFAULT '[]',   -- Decoy stars: [{id, x, y, hitbox_radius}]
    time_limit_sec      INTEGER NOT NULL DEFAULT 30
);

-- Individual game attempts/sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id           INTEGER NOT NULL,
    constellation_id    INTEGER NOT NULL,
    attempt_number      INTEGER NOT NULL DEFAULT 1,      -- 1, 2, or 3
    score               REAL    DEFAULT 0,
    time_elapsed_ms     INTEGER DEFAULT 0,
    wrong_connections   INTEGER DEFAULT 0,
    total_clicks        INTEGER DEFAULT 0,               -- computed from tilt->untilt cycles
    wand_travel_dist    REAL    DEFAULT 0,
    recalibration_count INTEGER DEFAULT 0,               -- triggered by shake
    completed_status    INTEGER DEFAULT 0,               -- 0=in-progress, 1=completed, 2=disqualified, 3=circle_exit
    created_at          TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (player_id)        REFERENCES players(id),
    FOREIGN KEY (constellation_id) REFERENCES constellations(id)
);

-- Leaderboard: Tracks best retained score per player
CREATE TABLE IF NOT EXISTS leaderboard (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id           INTEGER NOT NULL UNIQUE,
    highest_score       REAL    DEFAULT 0,
    attempts_used       INTEGER DEFAULT 0,
    updated_at          TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (player_id) REFERENCES players(id)
);
"""


def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()
