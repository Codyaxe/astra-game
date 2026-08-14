"""
Player model — CRUD with support for OCR & Mobile QR fallback,
3 attempts constraint, QR ticket tokens, and best score tracking.
"""

import uuid
from database.db import get_connection

MAX_ATTEMPTS = 3


def create_player(
    first_name: str,
    last_name: str,
    sr_code: str,
    course: str,
    contact_number: str = None,
    registration_source: str = "ocr",
    id_picture_path: str = None,
    ocr_raw_text: str = None,
) -> tuple[int, str]:
    """
    Insert a new player and generate a unique QR ticket code.
    Returns (player_id, qr_ticket_code).
    """
    qr_ticket_code = f"ASTRA-{sr_code.replace('-', '')}-{uuid.uuid4().hex[:6].upper()}"
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO players (
            first_name, last_name, sr_code, course,
            contact_number, registration_source, id_picture_path,
            ocr_raw_text, qr_ticket_code, total_attempts_used, best_score
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0.0)
        """,
        (
            first_name,
            last_name,
            sr_code,
            course,
            contact_number,
            registration_source,
            id_picture_path,
            ocr_raw_text,
            qr_ticket_code,
        ),
    )
    conn.commit()
    player_id = cursor.lastrowid
    conn.close()
    return player_id, qr_ticket_code


def get_player_by_id(player_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_player_by_sr_code(sr_code: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM players WHERE sr_code = ?", (sr_code,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_player_by_ticket(qr_ticket_code: str) -> dict | None:
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM players WHERE qr_ticket_code = ?", (qr_ticket_code.strip(),)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def increment_attempt_and_update_best_score(player_id: int, new_score: float) -> dict:
    """
    Increment total_attempts_used (capped at 3) and update best_score
    if new_score is higher than current best_score.
    """
    conn = get_connection()
    player = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    if not player:
        conn.close()
        raise ValueError("Player not found")

    current_attempts = player["total_attempts_used"]
    current_best = player["best_score"]

    new_attempts = min(MAX_ATTEMPTS, current_attempts + 1)
    retained_best = max(current_best, new_score)

    conn.execute(
        """
        UPDATE players
        SET total_attempts_used = ?,
            best_score = ?
        WHERE id = ?
        """,
        (new_attempts, retained_best, player_id),
    )
    conn.commit()
    conn.close()

    return {
        "player_id": player_id,
        "attempts_used": new_attempts,
        "attempts_remaining": max(0, MAX_ATTEMPTS - new_attempts),
        "best_score": retained_best,
        "is_new_high_score": new_score > current_best,
    }
