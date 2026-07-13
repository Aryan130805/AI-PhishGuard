from celery import Celery
from app.config import settings

celery_app = Celery(
    "phishguard",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=["app.tasks.tasks", "app.tasks.campaigns", "app.tasks.reports"],
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
)

from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    "check-scheduled-campaigns-every-minute": {
        "task": "app.tasks.campaigns.check_scheduled_campaigns",
        "schedule": 60.0,
    },
    "check-ignored-and-complete-campaigns-every-hour": {
        "task": "app.tasks.campaigns.check_ignored_and_complete_campaigns",
        "schedule": 3600.0,
    },
    "recompute-all-user-metrics-nightly": {
        "task": "app.tasks.campaigns.recompute_all_user_metrics",
        "schedule": crontab(hour=2, minute=0),
    }
}

