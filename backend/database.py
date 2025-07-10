# backend/database.py
"""
Database helper functions for direct SQL queries
"""

from contextlib import contextmanager
from flask import current_app
import psycopg2.extras

@contextmanager
def get_db_cursor(dict_cursor=True):
    """
    Context manager for database connections
    Returns cursor that automatically commits/rollbacks
    """
    conn = current_app.db_pool.getconn()
    try:
        cursor_factory = psycopg2.extras.RealDictCursor if dict_cursor else None
        cur = conn.cursor(cursor_factory=cursor_factory)
        yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        current_app.db_pool.putconn(conn)

def row_to_dict(row):
    """Convert a database row to dictionary"""
    if row is None:
        return None
    return dict(row) if hasattr(row, 'keys') else row

def execute_query(query, params=None, fetch_one=False, dict_cursor=True):
    """
    Execute a query and return results
    """
    with get_db_cursor(dict_cursor) as cur:
        cur.execute(query, params or [])
        if fetch_one:
            return row_to_dict(cur.fetchone())
        return [row_to_dict(row) for row in cur.fetchall()]

def execute_insert(query, params=None, returning=True):
    """
    Execute an INSERT query and return the inserted row
    """
    if returning and 'RETURNING' not in query.upper():
        query += ' RETURNING *'
    
    with get_db_cursor() as cur:
        cur.execute(query, params or [])
        if returning:
            return row_to_dict(cur.fetchone())
        return None

def execute_update(query, params=None):
    """
    Execute an UPDATE query
    """
    with get_db_cursor() as cur:
        cur.execute(query, params or [])
        return cur.rowcount

def execute_delete(query, params=None):
    """
    Execute a DELETE query
    """
    with get_db_cursor() as cur:
        cur.execute(query, params or [])
        return cur.rowcount