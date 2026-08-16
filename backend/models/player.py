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
    Update best_score and total_attempts_used for the player.
    """
    rows = execute("SELECT * FROM players WHERE id = %s", (player_id,))
    if not rows:
        # Fallback to guest record if player_id is not in DB (e.g. 9999)
        guest = get_player_by_sr_code("GUEST-01")
        if not guest:
            try:
                pid, _ = create_player(
                    first_name="Guest",
                    last_name="Explorer",
                    sr_code="GUEST-01",
                    course="BSCS",
                    department="CICS",
                    registration_source="guest"
                )
                player_id = pid
                rows = execute("SELECT * FROM players WHERE id = %s", (player_id,))
            except Exception:
                rows = []
        else:
            player_id = guest["id"]
            rows = [guest]

    if not rows:
        return {
            "player_id": player_id,
            "attempts_used": 1,
            "attempts_remaining": 2,
            "best_score": round(float(new_score or 0.0), 1),
            "is_new_high_score": True,
        }

    player = rows[0]
    current_best = float(player.get("best_score") or 0.0)

    # 1. Fetch scores grouped by attempt_number for this player
    avg_query = """
        SELECT attempt_number, SUM(score) as total_score, COUNT(*) as stages_count
        FROM game_sessions
        WHERE player_id = %s
        GROUP BY attempt_number
    """
    attempt_sums = execute(avg_query, (player_id,))

    best_score = max(current_best, float(new_score or 0.0))
    attempts_used = player.get("total_attempts_used", 0)

    for attempt in attempt_sums:
        att_num = attempt.get("attempt_number") or 1
        stages_count = max(1, attempt.get("stages_count") or 1)
        avg = float(attempt.get("total_score") or 0.0) / stages_count
        if avg > best_score:
            best_score = avg
        if att_num > attempts_used:
            attempts_used = att_num

    # Ensure attempts_used is sensible and capped
    attempts_used = min(MAX_ATTEMPTS, max(attempts_used, player.get("total_attempts_used", 0), 1))
    best_score = round(best_score, 1)

    execute(
        """
        UPDATE players
        SET total_attempts_used = %s,
            best_score = %s
        WHERE id = %s
        """,
        (attempts_used, best_score, player_id),
        commit=True,
    )

    return {
        "player_id": player_id,
        "attempts_used": attempts_used,
        "attempts_remaining": max(0, MAX_ATTEMPTS - attempts_used),
        "best_score": best_score,
        "is_new_high_score": best_score > current_best,
    }


def get_all_players() -> list[dict]:
    """Return all registered players ordered by creation date descending."""
    return execute("SELECT * FROM players ORDER BY created_at DESC")


def reset_player_attempts(player_id: int) -> bool:
    """Reset total attempts used for a player to 0."""
    execute("UPDATE players SET total_attempts_used = 0 WHERE id = %s", (player_id,), commit=True)
    return True


def delete_player(player_id: int) -> bool:
    """Delete player record and associated sessions."""
    execute("DELETE FROM session_mistakes WHERE session_id IN (SELECT id FROM game_sessions WHERE player_id = %s)", (player_id,), commit=True)
    execute("DELETE FROM game_sessions WHERE player_id = %s", (player_id,), commit=True)
    execute("DELETE FROM players WHERE id = %s", (player_id,), commit=True)
    return True


def find_player_by_ticket_or_sr(target: str) -> dict | None:
    """Find player by QR ticket code, BSU-TICKET payload, JSON, or SR code."""
    import re, json
    t = target.strip()

    # 1. Check if raw JSON
    try:
        data = json.loads(t)
        if isinstance(data, dict):
            sr = data.get("srCode") or data.get("sr_code")
            if sr:
                p = get_player_by_sr_code(sr)
                if p: return p
            pid = data.get("id") or data.get("player_id")
            if pid:
                p = get_player_by_id(pid)
                if p: return p
    except Exception:
        pass

    # 2. Check if BSU-TICKET:ID:SR_CODE format
    if t.startswith("BSU-TICKET:"):
        parts = t.replace("BSU-TICKET:", "").split(":")
        for part in parts:
            p = get_player_by_ticket(part) or get_player_by_sr_code(part)
            if p: return p
            if part.isdigit():
                p = get_player_by_id(int(part))
                if p: return p

    # 3. Direct QR ticket code
    rows = execute("SELECT * FROM players WHERE qr_ticket_code = %s", (t,))
    if rows:
        return rows[0]

    # 4. Direct SR Code
    rows = execute("SELECT * FROM players WHERE sr_code = %s", (t,))
    if rows:
        return rows[0]

    # 5. Extract SR code via regex pattern (e.g. 21-12345)
    sr_match = re.search(r"\b\d{2}-\d{4,6}\b", t)
    if sr_match:
        rows = execute("SELECT * FROM players WHERE sr_code = %s", (sr_match.group(0),))
        if rows:
            return rows[0]

    # 6. SR Code without hyphens
    clean_t = re.sub(r"[^a-zA-Z0-9]", "", t)
    rows = execute("SELECT * FROM players WHERE REPLACE(sr_code, '-', '') = %s", (clean_t,))
    if rows:
        return rows[0]

    return None


