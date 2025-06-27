# ml-service/core/logger.py
from loguru import logger
import sys
import os
from app.config import config

def setup_logger():
    """Configure loguru logger for the ML service"""
    
    # Remove default logger
    logger.remove()
    
    # Console logging
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True
    )