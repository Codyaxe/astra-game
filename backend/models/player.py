"""
Player model — CRUD with support for OCR & Mobile QR fallback,
3 attempts constraint, QR ticket tokens, and best score tracking.
 
Built on top of database/db.py's execute() helper:
    execute(query, params)              -> SELECT: list[dict]
    execute(query, params, commit=True) -> INSERT/UPDATE/DELETE: lastrowid
"""
 
import uuid
from database.db import execute
 
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
 
    Raises mysql.connector.errors.IntegrityError if sr_code or
    qr_ticket_code already exists (both columns are UNIQUE) — the
    caller (routes/auth.py) is responsible for catching that and
    returning a sensible response.
    """
    qr_ticket_code = f"ASTRA-{sr_code.replace('-', '')}-{uuid.uuid4().hex[:6].upper()}"
 
    query = """
        INSERT INTO players (
            first_name, last_name, sr_code, course,
            contact_number, registration_source, id_picture_path,
            ocr_raw_text, qr_ticket_code, total_attempts_used, best_score
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 0.0)
    """
    params = (
        first_name,
        last_name,
        sr_code,
        course,
        contact_number,
        registration_source,
        id_picture_path,
        ocr_raw_text,
        qr_ticket_code,
    )
    player_id = execute(query, params, commit=True)
    return player_id, qr_ticket_code
 
 
def get_player_by_id(player_id: int) -> dict | None:
    rows = execute("SELECT * FROM players WHERE id = %s", (player_id,))
    return rows[0] if rows else None
 
 
def get_player_by_sr_code(sr_code: str) -> dict | None:
    rows = execute("SELECT * FROM players WHERE sr_code = %s", (sr_code,))
    return rows[0] if rows else None
 
 
def get_player_by_ticket(qr_ticket_code: str) -> dict | None:
    rows = execute(
        "SELECT * FROM players WHERE qr_ticket_code = %s",
        (qr_ticket_code.strip(),),
    )
    return rows[0] if rows else None
 
 
def increment_attempt_and_update_best_score(player_id: int, new_score: float) -> dict:
    """
    Increment total_attempts_used (capped at MAX_ATTEMPTS) and update
    best_score if new_score beats the current best.
    """
    rows = execute("SELECT * FROM players WHERE id = %s", (player_id,))
    if not rows:
        raise ValueError("Player not found")
 
    player = rows[0]
    current_attempts = player["total_attempts_used"]
    current_best = float(player["best_score"])
 
    new_attempts = min(MAX_ATTEMPTS, current_attempts + 1)
    retained_best = max(current_best, new_score)
 
    execute(
        """
        UPDATE players
        SET total_attempts_used = %s,
            best_score = %s
        WHERE id = %s
        """,
        (new_attempts, retained_best, player_id),
        commit=True,
    )
 
    return {
        "player_id": player_id,
        "attempts_used": new_attempts,
        "attempts_remaining": max(0, MAX_ATTEMPTS - new_attempts),
        "best_score": retained_best,
        "is_new_high_score": new_score > current_best,
    }
