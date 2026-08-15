"""
GameSession model — Handles attempts, telemetry recording, and leaderboard sync.
"""

from database.db import get_connection
from models.player import (
    increment_attempt_and_update_best_score,
    get_player_by_id,
    MAX_ATTEMPTS,
)


def create_session(player_id: int, constellation_id: int, attempt_number: int = 1) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO game_sessions (player_id, constellation_id, attempt_number)
        VALUES (?, ?, ?)
        """,
        (player_id, constellation_id, attempt_number),
    )
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
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

    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [session_id]

    conn = get_connection()
    conn.execute(f"UPDATE game_sessions SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()


def get_session(session_id: int) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM game_sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def finalize_attempt(session_id: int, final_score: float, completed_status: int = 1) -> dict:
    """
    Finalize a game session exactly once.

    One game session = one player attempt.

    completed_status:
        1 = Completed
        2 = Disqualified / timer expired
        3 = Force exit
    """
    session = get_session(session_id)

    if not session:
        raise ValueError("Session not found")

    # If this session was already finalized, do not consume
    # another player attempt.
    if session["completed_status"] in (1, 2, 3):
        player = get_player_by_id(session["player_id"])

        return {
            "player_id": player["id"],
            "attempts_used": player["total_attempts_used"],
            "attempts_remaining": max(
                0,
                MAX_ATTEMPTS - player["total_attempts_used"]
            ),
            "best_score": player["best_score"],
            "is_new_high_score": False,
        }

    player_id = session["player_id"]

    # Save the actual result of this session.
    update_session(
        session_id,
        completed_status=completed_status,
        score=final_score,
    )

    # Consume exactly one attempt.
    attempt_result = increment_attempt_and_update_best_score(
        player_id,
        final_score
    )

    # Sync player with leaderboard.
    conn = get_connection()

    conn.execute(
        """
        INSERT INTO leaderboard (
            player_id,
            highest_score,
            attempts_used,
            updated_at
        )
        VALUES (?, ?, ?, datetime('now'))

        ON CONFLICT(player_id) DO UPDATE SET
            highest_score = MAX(
                leaderboard.highest_score,
                excluded.highest_score
            ),
            attempts_used = excluded.attempts_used,
            updated_at = datetime('now')
        """,
        (
            player_id,
            attempt_result["best_score"],
            attempt_result["attempts_used"],
        ),
    )

    conn.commit()
    conn.close()

    return attempt_result


def get_leaderboard(limit: int = 10) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT l.*, p.first_name, p.last_name, p.sr_code, p.course
        FROM leaderboard l
        JOIN players p ON p.id = l.player_id
        ORDER BY l.highest_score DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
