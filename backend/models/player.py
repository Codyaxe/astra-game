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
    mi: str = "",
    department: str = "",
    year_level: str = "",
    section: str = "",
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
            ocr_raw_text, qr_ticket_code, total_attempts_used, best_score,
            mi, department, year_level, section
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 0.0, %s, %s, %s, %s)
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
        mi,
        department,
        year_level,
        section,
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
    Update best_score and total_attempts_used by dynamically calculating averages 
    across all constellations in the database.
    """
    rows = execute("SELECT * FROM players WHERE id = %s", (player_id,))
    if not rows:
        raise ValueError("Player not found")

    player = rows[0]
    current_best = float(player["best_score"])

    # 1. Fetch total constellations count in the database
    const_count_row = execute("SELECT COUNT(*) as count FROM constellations")
    total_constellations = max(1, const_count_row[0]["count"] if const_count_row else 1)

    # 2. Fetch sum of scores grouped by attempt_number for this player
    avg_query = """
        SELECT attempt_number, SUM(score) as total_score
        FROM game_sessions
        WHERE player_id = %s
        GROUP BY attempt_number
    """
    attempt_sums = execute(avg_query, (player_id,))

    # 3. Calculate max average score and maximum attempt number
    best_avg = 0.0
    attempts_used = 0
    for attempt in attempt_sums:
        att_num = attempt["attempt_number"]
        avg = float(attempt["total_score"]) / total_constellations
        if avg > best_avg:
            best_avg = avg
        if att_num > attempts_used:
            attempts_used = att_num

    # Ensure attempts_used is sensible and capped
    attempts_used = min(MAX_ATTEMPTS, max(attempts_used, player["total_attempts_used"]))
    best_avg = round(best_avg, 2)

    execute(
        """
        UPDATE players
        SET total_attempts_used = %s,
            best_score = %s
        WHERE id = %s
        """,
        (attempts_used, best_avg, player_id),
        commit=True,
    )

    return {
        "player_id": player_id,
        "attempts_used": attempts_used,
        "attempts_remaining": max(0, MAX_ATTEMPTS - attempts_used),
        "best_score": best_avg,
        "is_new_high_score": best_avg > current_best,
    }
