from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.db.init_db import init_database
from app.core.logger import setup_logging


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    settings = get_settings()
    settings.ensure_directories()
    init_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs",
        redoc_url=f"{settings.api_v1_prefix}/redoc",
    )

    import time
    from fastapi import Request
    from app.core.logger import get_logger
    
    logger = get_logger("middleware")

    @app.middleware("http")
    async def request_timing_and_ratelimit_middleware(request: Request, call_next):
        """Prepare for rate limits and log basic request info."""
        # TODO: integrate redis-based rate limiting here
        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            if response.status_code >= 400:
                logger.warning(f"{request.method} {request.url.path} - {response.status_code} in {process_time:.4f}s")
            return response
        except Exception as exc:
            process_time = time.time() - start_time
            logger.error(f"Failed handling request {request.method} {request.url.path} in {process_time:.4f}s: {exc}")
            raise

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.mount(
        settings.storage_url_prefix,
        StaticFiles(directory=settings.storage_root),
        name="storage",
    )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
