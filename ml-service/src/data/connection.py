# ml-service/src/database/connection.py
# Database connection and session management for ML service

import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
from typing import Generator
from ..data.models import Base
from ..core.logger import setup_logger

logger = setup_logger(__name__)

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://timely_user:timely_password@postgres:5432/timely_db"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
    echo=False,  # Set to True for SQL debugging
    future=True
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine,
    future=True
)

def init_database():
    """Initialize database tables if needed."""
    try:
        # Note: We don't create tables here since they're managed by backend
        # This just verifies connection works
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("Database connection verified successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def get_db() -> Session:
    """
    Get database session.
    Use this in dependency injection contexts.
    """
    db = SessionLocal()
    try:
        return db
    except Exception as e:
        db.close()
        logger.error(f"Database session creation failed: {e}")
        raise

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions with automatic cleanup.
    Use this for manual session management.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        db.close()

def test_database_connection() -> bool:
    """Test database connectivity."""
    try:
        with get_db_session() as db:
            # Simple connectivity test
            result = db.execute(text("SELECT 1"))
            result.fetchone()
        logger.info("Database connection test successful")
        return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False

def get_database_info() -> dict:
    """Get database information for health checks."""
    try:
        with get_db_session() as db:
            # Get user count for basic stats
            user_count_result = db.execute(text("SELECT COUNT(*) FROM users"))
            user_count = user_count_result.scalar()
            
            # Get order count
            order_count_result = db.execute(text("SELECT COUNT(*) FROM orders"))
            order_count = order_count_result.scalar()
            
            # Get product count
            product_count_result = db.execute(text("SELECT COUNT(*) FROM products"))
            product_count = product_count_result.scalar()
            
            return {
                "status": "connected",
                "user_count": user_count,
                "order_count": order_count,
                "product_count": product_count,
                "connection_url": DATABASE_URL.split("@")[-1]  # Hide credentials
            }
    except Exception as e:
        logger.error(f"Database info query failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

# Connection event handlers for logging
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Handle connection events if needed."""
    pass

@event.listens_for(engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """Log database connection checkout events."""
    logger.debug("Database connection checked out")

@event.listens_for(engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """Log database connection checkin events."""
    logger.debug("Database connection checked in")