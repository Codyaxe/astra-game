"""
Game Session model — Handles player game-session records.

Database:
    MySQL / mysql.connector

Table:
    game_session

Schema:
    game_session_id  PK
    user_id          FK -> players.id
    attempt_number
    score
    total_time
    mistakes
    distance
"""

from database.db import get_connection


def create_game_session(
    user_id: int,
    attempt_number: int,
    score: float,
    total_time: int,
    mistakes: int,
    distance: float,
) -> int:
    """
    Create a game-session record.

    Returns:
        The ID of the newly created game session.
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO game_session (
                user_id,
                attempt_number,
                score,
                total_time,
                mistakes,
                distance
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                attempt_number,
                score,
                total_time,
                mistakes,
                distance,
            ),
        )

        conn.commit()
        return cursor.lastrowid

    finally:
        cursor.close()
        conn.close()


def get_game_session(game_session_id: int) -> dict | None:
    """
    Retrieve a game session by its ID.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM game_session
            WHERE game_session_id = %s
            """,
            (game_session_id,),
        )

        row = cursor.fetchone()
        return row

    finally:
        cursor.close()
        conn.close()


def get_game_sessions_by_user(user_id: int) -> list[dict]:
    """
    Retrieve all game sessions belonging to a player.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT *
            FROM game_session
            WHERE user_id = %s
            ORDER BY game_session_id DESC
            """,
            (user_id,),
        )

        rows = cursor.fetchall()
        return rows

    finally:
        cursor.close()
        conn.close()


def get_leaderboard(limit: int = 10) -> list[dict]:
    """
    Retrieve the highest-scoring game sessions.

    Each game session represents one attempt.
    Players may therefore appear more than once if they have
    multiple high-scoring attempts.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                gs.game_session_id,
                gs.user_id,
                gs.attempt_number,
                gs.score,
                gs.total_time,
                gs.mistakes,
                gs.distance,
                p.first_name,
                p.last_name,
                p.sr_code,
                p.course
            FROM game_session gs
            JOIN players p
                ON p.id = gs.user_id
            ORDER BY gs.score DESC
            LIMIT %s
            """,
            (limit,),
        )

        rows = cursor.fetchall()
        return rows

    finally:
        cursor.close()
        conn.close()

def get_leaderboard(limit: int = 10) -> list[dict]:
    """
    Return players ranked by their best game-session score.

    Each player appears only once. The attempt number returned
    is the attempt on which they achieved their best score.
    """

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                gs.game_session_id,
                gs.user_id,
                p.first_name,
                p.last_name,
                p.sr_code,
                p.course,
                gs.score,
                gs.attempt_number
            FROM game_session gs
            JOIN players p
                ON p.id = gs.user_id
            INNER JOIN (
                SELECT
                    user_id,
                    MAX(score) AS best_score
                FROM game_session
                GROUP BY user_id
            ) best
                ON best.user_id = gs.user_id
                AND best.best_score = gs.score
            ORDER BY gs.score DESC
            LIMIT %s
            """,
            (limit,),
        )

        rows = cursor.fetchall()

        return rows

    finally:
        cursor.close()
        conn.close()