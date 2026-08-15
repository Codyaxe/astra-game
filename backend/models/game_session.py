"""
GameSession model — Handles attempts, telemetry recording, and leaderboard sync (MySQL).
"""

from database.db import execute, get_leaderboard
from models.player import (
    increment_attempt_and_update_best_score,
    get_player_by_id,
    MAX_ATTEMPTS,
)


def create_session(player_id: int, constellation_id: int = 1, attempt_number: int = 1) -> int:
    query = """
        INSERT INTO game_sessions (player_id, constellation_id, attempt_number)
        VALUES (%s, %s, %s)
    """
    session_id = execute(query, (player_id, constellation_id, attempt_number), commit=True)
    return session_id


def create_game_session(player_id: int, constellation_id: int = 1, attempt_number: int = 1, **kwargs) -> int:
    return create_session(player_id, constellation_id, attempt_number)


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


def get_game_session(session_id: int) -> dict | None:
    return get_session(session_id)


def finalize_attempt(session_id: int, final_score: float, completed_status: int = 1) -> dict:
    """
    Finalize a game session exactly once.
    One game session = one player attempt.
    """
    session = get_session(session_id)
    if not session:
        raise ValueError("Session not found")

    player_id = session["player_id"]

    # Save session result
    update_session(
        session_id,
        completed_status=completed_status,
        score=final_score,
    )

    # Increment attempt and update best score
    attempt_result = increment_attempt_and_update_best_score(player_id, final_score)

    return {
        "player_id": player_id,
        "attempts_used": attempt_result["attempts_used"],
        "attempts_remaining": max(0, MAX_ATTEMPTS - attempt_result["attempts_used"]),
        "best_score": attempt_result["best_score"],
        "is_new_high_score": attempt_result.get("is_new_high_score", False),
    }
