"""
reset_test_data.py — Cleanup script for wiping test players and practice sessions.
Usage:
    cd backend
    python database/reset_test_data.py
"""

import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database.db import get_connection

def reset_game_data():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("TRUNCATE TABLE game_sessions;")
        cursor.execute("TRUNCATE TABLE players;")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        conn.commit()
        print("[OK] Successfully cleared all test players and game sessions!")
        print("Database is clean for live testing.")
    except Exception as e:
        conn.rollback()
        print("[ERROR] Error clearing data:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    reset_game_data()
