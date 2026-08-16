import mysql.connector
from mysql.connector import pooling
from config import Config

_pool = None

def _get_pool():
    global _pool
    if _pool is None:
        try:
            _pool = pooling.MySQLConnectionPool(
                pool_name="constellation_pool",
                pool_size=5,
                host=Config.MYSQL_HOST,
                port=Config.MYSQL_PORT,
                user=Config.MYSQL_USER,
                password=Config.MYSQL_PASSWORD,
                database=Config.MYSQL_DATABASE,
                autocommit=False,
            )
        except Exception:
            _pool = False
    return _pool

def get_connection():
    """Get a pooled MySQL connection with fallback to direct connection."""
    pool = _get_pool()
    if pool:
        try:
            return pool.get_connection()
        except Exception:
            pass
    return mysql.connector.connect(
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DATABASE,
    )


def get_cursor(conn, dictionary: bool = True):
    """Get a cursor from a connection. dictionary=True -> rows as dicts."""
    return conn.cursor(dictionary=dictionary)


def execute(query: str, params: tuple = (), commit: bool = False):
    """
    Run a single query and return all rows (as list of dicts).
    Use commit=True for INSERT/UPDATE/DELETE (returns lastrowid).
    """
    conn = get_connection()
    try:
        cursor = get_cursor(conn)
        cursor.execute(query, params)
        if commit:
            conn.commit()
            result = cursor.lastrowid
        else:
            result = cursor.fetchall()
        cursor.close()
        return result
    finally:
        conn.close()


def get_leaderboard(limit: int = 10):
    """
    Best score per player, ranked highest first.
    No separate leaderboard table — players.best_score is the
    source of truth and is already updated whenever a session beats it.
    """
    query = """
        SELECT 
            id,
            id AS player_id,
            first_name, 
            last_name, 
            sr_code, 
            course, 
            department,
            total_attempts_used AS attempts_used,
            best_score,
            best_score AS highest_score
        FROM players
        WHERE best_score > 0
        ORDER BY best_score DESC, total_attempts_used ASC, id ASC
        LIMIT %s
    """
    return execute(query, (limit,))


def init_db():
    """
    Startup sanity check — confirms the pool can reach MySQL.
    Also migrates any missing columns for extra registration data.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Verify connection
        cursor.execute("SELECT 1")
        cursor.fetchone()

        # Check and add registration fields if they don't exist
        try:
            cursor.execute("SHOW COLUMNS FROM players")
            existing_columns = [col[0] for col in cursor.fetchall()]
            for col_name, col_def in [
                ('mi', "VARCHAR(10) DEFAULT ''"),
                ('department', "VARCHAR(50) DEFAULT ''"),
                ('year_level', "VARCHAR(20) DEFAULT ''"),
                ('section', "VARCHAR(50) DEFAULT ''")
            ]:
                if col_name not in existing_columns:
                    print(f"[DB MIGRATION] Adding column '{col_name}' to players table")
                    cursor.execute(f"ALTER TABLE players ADD COLUMN {col_name} {col_def}")
            conn.commit()

            # Check and add accuracy column to game_sessions table if it doesn't exist
            cursor.execute("SHOW COLUMNS FROM game_sessions")
            existing_session_columns = [col[0] for col in cursor.fetchall()]
            if 'accuracy' not in existing_session_columns:
                print("[DB MIGRATION] Adding column 'accuracy' to game_sessions table")
                cursor.execute("ALTER TABLE game_sessions ADD COLUMN accuracy DOUBLE DEFAULT 100.0")
                conn.commit()
        except Exception as migration_exc:
            print(f"[DB MIGRATION WARNING] Failed to migrate tables: {migration_exc}")

        cursor.close()
    finally:
        conn.close()