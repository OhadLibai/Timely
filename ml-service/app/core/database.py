# ml-service/core/database.py
import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from loguru import logger
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path
from app.config import config

# Load root .env
root_dir = Path(__file__).parent.parent.parent.parent
load_dotenv(root_dir / '.env')


def get_db_connection():
    """Get PostgreSQL database connection"""
    database_url = config.DATABASE_URL
    
    if not database_url:
        logger.warning("DATABASE_URL not set, database features will be unavailable")
        return None
    
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
            return conn
        except psycopg2.Error as e:
            logger.error(f"Database connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                raise

def execute_query(query: str, params: Optional[tuple] = None) -> Optional[list]:
    """Execute a SELECT query and return results"""
    conn = None
    cursor = None
    
    try:
        conn = get_db_connection()
        if not conn:
            return None
        
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, params)
        results = cursor.fetchall()
        return results
        
    except Exception as e:
        logger.error(f"Query execution failed: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def get_user_instacart_id(user_id: str) -> Optional[int]:
    """Get Instacart user ID from our database user"""
    query = """
        SELECT metadata->>'instacart_user_id' as instacart_user_id
        FROM users
        WHERE id = %s
    """
    
    results = execute_query(query, (user_id,))
    if results and results[0]['instacart_user_id']:
        try:
            return int(results[0]['instacart_user_id'])
        except (ValueError, TypeError):
            return None
    return None

def get_user_order_history_from_db(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user's order history from database (if seeded)"""
    # This is optional - we mainly use CSV data
    # But could be used for database-based predictions
    query = """
        SELECT o.id, o.order_number, o.days_since_prior_order,
               o.order_dow, o.order_hour_of_day, o.created_at,
               array_agg(oi.product_id) as product_ids
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = %s
        GROUP BY o.id
        ORDER BY o.created_at
    """
    
    results = execute_query(query, (user_id,))
    if not results:
        return None
    
    return {
        'user_id': user_id,
        'orders': results
    }