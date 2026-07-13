import logging
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(name="app.tasks.tasks.test_task")
def test_task(x: int, y: int) -> int:
    logger.info(f"Running test task with x={x}, y={y}")
    result = x + y
    logger.info(f"Task completed. Result={result}")
    return result
