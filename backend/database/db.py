import mysql.connector
from mysql.connector import pooling
from config import Config

_pool = pooling.MySQLConnectionPool(
    pool_name="constellation_pool",
    pool_size=32,
    host=Config.MYSQL_HOST,
    port=Config.MYSQL_PORT,
    user=Config.MYSQL_USER,
    password=Config.MYSQL_PASSWORD,
    database=Config.MYSQL_DATABASE,
    autocommit=False,
)


def get_connection():
    """Get a pooled MySQL connection with fallback to direct connection."""
    try:
        return _pool.get_connection()
    except Exception:
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
        SELECT id, first_name, last_name, sr_code, course, best_score
        FROM players
        WHERE best_score > 0
        ORDER BY best_score DESC
        LIMIT %s
    """
    return execute(query, (limit,))


def init_db():
    """
    Startup sanity check — confirms the pool can reach MySQL.
    Schema itself is applied manually via the SQL file, not here.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
    finally:
        conn.close()