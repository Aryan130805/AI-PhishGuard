import time
import logging
import sys
import structlog
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from app.security import decode_token

def setup_logging():
    # Reset any existing handlers
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)

    # Configure stdlib logging to write to stdout
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=logging.INFO,
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
        except Exception as e:
            duration = time.perf_counter() - start_time
            user_id = self._get_user_id(request)
            
            logger.error(
                "request_failed",
                method=request.method,
                path=request.url.path,
                status=500,
                duration_ms=round(duration * 1000, 2),
                user_id=user_id,
                error=str(e),
            )
            raise e
            
        duration = time.perf_counter() - start_time
        user_id = self._get_user_id(request)
        
        logger.info(
            "request_processed",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration * 1000, 2),
            user_id=user_id,
        )
        return response

    def _get_user_id(self, request: Request) -> str | None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            return payload.get("sub")
        return None
