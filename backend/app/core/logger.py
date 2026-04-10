import logging
import sys
from typing import Any

from app.core.config import get_settings

def setup_logging() -> None:
    settings = get_settings()
    log_level = logging.DEBUG if settings.debug else logging.INFO

    # Custom log format for production readiness
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Disable overly verbose loggers from libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)
    logging.getLogger("python_multipart").setLevel(logging.WARNING)
    logging.getLogger("python_multipart.multipart").setLevel(logging.WARNING)
    
    logger = logging.getLogger("imageclear")
    logger.info("Logging initialized with level: %s", logging.getLevelName(log_level))

def get_logger(module_name: str) -> logging.Logger:
    """Reusable utility to get a logger instance"""
    return logging.getLogger(f"imageclear.{module_name}")
