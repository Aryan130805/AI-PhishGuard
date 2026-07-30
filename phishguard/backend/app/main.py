import os
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

    # Middleware to strip optional /api prefix for unified backend routes
    @app.middleware("http")
    async def strip_api_prefix(request: Request, call_next):
        if request.url.path.startswith("/api/"):
            request.scope["path"] = request.url.path[4:]
        elif request.url.path == "/api":
            request.scope["path"] = "/"
        return await call_next(request)

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
            "http://localhost:8000",
            "http://127.0.0.1:8000",
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
        # This patcher is only needed for SQLite (local dev without Supabase).
        # When connected to PostgreSQL / Supabase the schema is already fully
        # applied via supabase_migration.sql, so we skip it entirely to avoid
        # "column already exists" errors on startup.
        from app.database import engine
        if not engine.url.drivername.startswith("sqlite"):
            print("[startup] PostgreSQL/Supabase detected — skipping SQLite column patcher.")
            return

        try:
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
                if "lessons" in inspector.get_table_names():
                    cols = [c["name"] for c in inspector.get_columns("lessons")]
                    lesson_cols = [
                        ("category", "VARCHAR DEFAULT 'Phishing Attacks'"),
                        ("difficulty", "VARCHAR DEFAULT 'Beginner'"),
                        ("summary", "VARCHAR"),
                        ("is_emerging_threat", "BOOLEAN DEFAULT 0"),
                        ("cve_id", "VARCHAR"),
                        ("published_date", "VARCHAR"),
                    ]
                    for col_name, col_type in lesson_cols:
                        if col_name not in cols:
                            conn.execute(text(f"ALTER TABLE lessons ADD COLUMN {col_name} {col_type}"))
                conn.commit()
        except Exception as e:
            print(f"[startup] SQLite column sync warning: {e}")

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

    # Mount static files and SPA route if compiled frontend dist exists
    static_dir = os.environ.get(
        "STATIC_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
    )
    assets_dir = os.path.join(static_dir, "assets")

    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ["health", "docs", "openapi.json", "redoc"]:
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)

        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Frontend static build not found. Please build frontend first.")

    return app

app = create_app()

