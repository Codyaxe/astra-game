"""
GameSession model — Handles attempts, telemetry recording, and leaderboard sync (MySQL).
"""

from database.db import execute
from models.player import (
    increment_attempt_and_update_best_score,
    get_player_by_id,
    MAX_ATTEMPTS,
)


def create_session(player_id: int, constellation_id: int, attempt_number: int = 1) -> int:
    query = """
        INSERT INTO game_sessions (player_id, constellation_id, attempt_number)
        VALUES (%s, %s, %s)
    """
    session_id = execute(query, (player_id, constellation_id, attempt_number), commit=True)
    return session_id


def update_session(session_id: int, **kwargs) -> None:
    allowed = {
        "score", "time_elapsed_ms", "wrong_connections",
        "total_clicks", "wand_travel_dist", "recalibration_count",
        "completed_status",
    }
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values = list(fields.values()) + [session_id]

    execute(f"UPDATE game_sessions SET {set_clause} WHERE id = %s", tuple(values), commit=True)


def get_session(session_id: int) -> dict | None:
    rows = execute("SELECT * FROM game_sessions WHERE id = %s", (session_id,))
    return rows[0] if rows else None


def finalize_attempt(session_id: int, final_score: float, completed_status: int = 1) -> dict:
    """
    Finalize a game session exactly once.
    One game session = one player attempt.
    """
    session = get_session(session_id)
    if not session:
        raise ValueError("Session not found")

    # If this session was already finalized, do not consume another attempt.
    if session["completed_status"] in (1, 2, 3):
        player = get_player_by_id(session["player_id"])
        return {
            "player_id": player["id"],
            "attempts_used": player["total_attempts_used"],
            "attempts_remaining": max(0, MAX_ATTEMPTS - player["total_attempts_used"]),
            "best_score": player["best_score"],
            "is_new_high_score": False,
        }

    player_id = session["player_id"]

    # Save session result
    update_session(
        session_id,
        completed_status=completed_status,
        score=final_score,
    )

    # Increment attempt and update best score
    attempt_result = increment_attempt_and_update_best_score(player_id, final_score)

    # Sync to leaderboard table
    leaderboard_query = """
        INSERT INTO leaderboard (player_id, highest_score, attempts_used, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE
            highest_score = GREATEST(leaderboard.highest_score, VALUES(highest_score)),
            attempts_used = VALUES(attempts_used),
            updated_at    = NOW()
    """
    execute(
        leaderboard_query,
        (player_id, attempt_result["best_score"], attempt_result["attempts_used"]),
        commit=True,
    )

    return attempt_result


def get_leaderboard(limit: int = 10) -> list[dict]:
    query = """
        SELECT l.*, p.first_name, p.last_name, p.sr_code, p.course
        FROM leaderboard l
        JOIN players p ON p.id = l.player_id
        ORDER BY l.highest_score DESC
        LIMIT %s
    """
    return execute(query, (limit,))
