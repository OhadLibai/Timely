# ml-service/core/logger.py
from loguru import logger
import sys
import os

def setup_logger():
    """Configure loguru logger for the ML service"""
    
    # Remove default logger
    logger.remove()
    
    # Console logging
    log_level = os.getenv("LOG_LEVEL", "INFO")
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True
    )
    
    # File logging (if in production)
    if os.getenv("NODE_ENV") == "production":
        logger.add(
            "/app/logs/ml_service.log",
            level="INFO",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="100 MB",
            retention="7 days",
            compression="zip"
        )
        
        # Error log file
        logger.add(
            "/app/logs/ml_service_errors.log",
            level="ERROR",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="50 MB",
            retention="30 days",
            compression="zip"
        )
    
    logger.info(f"Logger initialized with level: {log_level}")