from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.database import get_db
from app.config import settings
from app.tasks.tasks import test_task
import redis

from app.logging_config import setup_logging, LoggingMiddleware
from app.exceptions import add_exception_handlers
from app.routers import auth, users, campaigns, templates, tracking, extension, analytics, risk, training, notifications, reports

def create_app() -> FastAPI:
    # Setup structured logging configuration
    setup_logging()

    app = FastAPI(title=settings.PROJECT_NAME)

    # Setup CORS middleware to allow cross-origin credentials (cookies)
    from fastapi.middleware.cors import CORSMiddleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:80",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Wire Logging middleware
    app.add_middleware(LoggingMiddleware)

    # Wire exception handlers
    add_exception_handlers(app)

    # Register routers
    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(campaigns.router)
    app.include_router(templates.router)
    app.include_router(tracking.router)
    app.include_router(extension.router)
    app.include_router(analytics.router)
    app.include_router(risk.router)
    app.include_router(training.router)
    app.include_router(training.cert_router)
    app.include_router(notifications.router)
    app.include_router(reports.router)

    @app.get("/health")
    def health_check(db: Session = Depends(get_db)):
        health_status = {
            "status": "healthy",
            "database": "unhealthy",
            "redis": "unhealthy",
            "celery": "healthy"
        }
        
        # Check Database
        try:
            db.execute(text("SELECT 1"))
            health_status["database"] = "healthy"
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["database_error"] = str(e)
            
        # Check Redis
        try:
            r = redis.Redis.from_url(settings.CELERY_BROKER_URL)
            r.ping()
            health_status["redis"] = "healthy"
        except Exception as e:
            health_status["status"] = "unhealthy"
            health_status["redis_error"] = str(e)
            
        # Trigger Celery test task asynchronously
        try:
            task = test_task.delay(10, 20)
            health_status["celery_task_id"] = task.id
        except Exception as e:
            health_status["celery"] = "unhealthy"
            health_status["celery_error"] = str(e)
            
        return health_status

    return app

app = create_app()
