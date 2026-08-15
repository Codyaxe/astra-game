"""
Seed 30 test players with varying scores for leaderboard UI testing.
Run: python -m database.seed_test_players
"""

import random
import uuid
from database.db import get_connection

COURSES = [
    "BS Computer Science",
    "BS Information Technology",
    "BS Software Engineering",
    "BS Data Science",
    "BS Electronics Engineering",
    "BS Civil Engineering",
    "BS Mechanical Engineering",
    "BS Electrical Engineering",
    "BS Architecture",
    "BS Accountancy",
]

FIRST_NAMES = [
    "James", "Maria", "Juan", "Anna", "Carlos",
    "Sofia", "Miguel", "Elena", "Diego", "Lucia",
    "Andres", "Camila", "Rafael", "Isabella", "Luis",
    "Valentina", "Marco", "Gabriella", "Pedro", "Ana",
    "Jose", "Maria", "Antonio", "Carmen", "Francisco",
    "Teresa", "Manuel", "Rosa", "Daniel", "Laura",
]

LAST_NAMES = [
    "Santos", "Reyes", "Cruz", "Garcia", "Mendoza",
    "Torres", "Ramos", "Gonzales", "Rivera", "Flores",
    "Morales", "Castillo", "Jimenez", "Villanueva", "Delgado",
    "Pascual", "Aguilar", "Santiago", "Mercado", "Aquino",
    "Soriano", "Manalo", "Lim", "Tan", "Ong",
    "Chua", "Sy", "Go", "Pangilinan", "Padilla",
]


def seed_test_players(count=30):
    """Insert test players with random scores into players and leaderboard tables."""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Clear existing test data (optional — comment out if you want to keep real data)
        # cursor.execute("DELETE FROM leaderboard WHERE player_id IN (SELECT id FROM players WHERE qr_ticket_code LIKE 'ASTRA-TEST-%')")
        # cursor.execute("DELETE FROM players WHERE qr_ticket_code LIKE 'ASTRA-TEST-%'")

        inserted = 0
        for i in range(count):
            first = random.choice(FIRST_NAMES)
            last = random.choice(LAST_NAMES)
            course = random.choice(COURSES)
            sr_code = f"2024-{random.randint(10000, 99999)}"
            qr_code = f"ASTRA-TEST-{uuid.uuid4().hex[:8].upper()}"
            attempts = random.randint(1, 3)
            best_score = round(random.uniform(15.0, 98.5), 2)

            # Insert player
            cursor.execute(
                """
                INSERT INTO players (
                    first_name, last_name, sr_code, course,
                    registration_source, qr_ticket_code,
                    total_attempts_used, best_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (first, last, sr_code, course, "test_seed", qr_code, attempts, best_score),
            )
            player_id = cursor.lastrowid

            # Insert leaderboard entry
            cursor.execute(
                """
                INSERT INTO leaderboard (player_id, highest_score, attempts_used)
                VALUES (%s, %s, %s)
                """,
                (player_id, best_score, attempts),
            )

            inserted += 1
            print(f"  [{inserted:2d}/{count}] {first} {last} — {course} — Score: {best_score} — Attempts: {attempts}/3")

        conn.commit()
        print(f"\n✅ Seeded {inserted} test players successfully.")

    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    print("🌟 Seeding 30 test players for leaderboard...\n")
    seed_test_players(30)
