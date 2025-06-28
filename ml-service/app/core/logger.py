# ml-service/app/core/logger.py
from loguru import logger
import sys
import os
from app.config import config

def setup_logger():
    """Configure loguru logger for the ML service"""
    
    # Remove default logger
    logger.remove()
    
    # Determine log level based on environment
    env = os.getenv('NODE_ENV', 'development').lower()
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    
    # Console logging with enhanced format for dev/test
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
        backtrace=True,  # Show full traceback in dev/test
    )
    
    # Add request ID context for tracing (if available)
    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "level": log_level,
                "format": "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{extra[request_id]}</cyan> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
                "colorize": True
            }
        ],
        extra={"request_id": ""}
    )
    
    logger.info(f"Logger configured for {env} environment at {log_level} level")
    
    return logger

# Initialize logger when imported
setup_logger()