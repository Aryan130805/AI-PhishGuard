from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql import text
from app.database import get_db
from app.config import settings
from app.tasks.tasks import test_task
import redis

from app.logging_config import setup_logging, LoggingMiddleware
from app.exceptions import add_exception_handlers
from app.routers import auth, users, campaigns, templates, tracking, extension, analytics, risk, training, notifications, reports, organizations

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
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://localhost:80",
            "https://phisguard-ochre.vercel.app",
        ],
        allow_origin_regex=r"https://.*\.vercel\.app",
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
    app.include_router(organizations.router)

    @app.on_event("startup")
    def sync_db_columns():
        try:
            from app.database import engine
            from sqlalchemy import inspect
            inspector = inspect(engine)
            with engine.connect() as conn:
                if "organizations" in inspector.get_table_names():
                    cols = [c["name"] for c in inspector.get_columns("organizations")]
                    org_cols = [
                        ("industry", "VARCHAR"),
                        ("company_size", "VARCHAR"),
                        ("website", "VARCHAR"),
                        ("country", "VARCHAR"),
                        ("state", "VARCHAR"),
                        ("city", "VARCHAR"),
                        ("logo_url", "VARCHAR"),
                        ("is_verified", "BOOLEAN DEFAULT 1"),
                    ]
                    for col_name, col_type in org_cols:
                        if col_name not in cols:
                            conn.execute(text(f"ALTER TABLE organizations ADD COLUMN {col_name} {col_type}"))
                if "users" in inspector.get_table_names():
                    cols = [c["name"] for c in inspector.get_columns("users")]
                    if "first_name" not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR"))
                    if "last_name" not in cols:
                        conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR"))
                conn.commit()
        except Exception as e:
            print(f"Table sync warning: {e}")

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
