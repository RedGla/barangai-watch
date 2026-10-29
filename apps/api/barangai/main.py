import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .auth import attempts
from .auth import router as auth_router
from .body_limit import ReportBodyLimitMiddleware
from .chat import router as chat_router
from .checker import validate_configured_checker
from .db import database_url, upgrade_sqlite
from .duplicates import router as duplicates_router
from .geo import router as geo_router
from .google_auth import router as google_router
from .media import validate_storage_config
from .notifications import router as notifications_router
from .reports import router as reports_router
from .workflow import router as workflow_router


def create_app():
    validate_configured_checker()
    validate_storage_config()
    app = FastAPI(title="BarangAI API", root_path=os.environ.get("API_ROOT_PATH", ""))
    attempts.clear()

    if database_url().startswith("sqlite"):
        upgrade_sqlite()
    app.include_router(auth_router)
    app.include_router(google_router)
    app.include_router(reports_router)
    app.include_router(workflow_router)
    app.include_router(chat_router)
    app.include_router(duplicates_router)
    app.include_router(notifications_router)
    app.include_router(geo_router)
    app.add_middleware(ReportBodyLimitMiddleware)

    @app.get("/health", include_in_schema=False)
    def health():
        return {"status": "ok"}

    return app


class SiteFiles(StaticFiles):
    """Static website that answers client routes (paths without a file extension) with index.html."""

    async def get_response(self, path, scope):
        parts = Path(path).parts
        if any(part.startswith(".") for part in parts):
            raise StarletteHTTPException(404)  # Never serve dotfiles such as .env or .git, even if present.
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as error:
            # Unknown API paths stay API 404s; missing assets (with an extension) stay 404s.
            if error.status_code != 404 or "." in Path(path).name or (parts and parts[0].startswith("api")):
                raise
            return await super().get_response("index.html", scope)


def site_app(api, directory):
    directory = Path(directory)
    if not (directory / "index.html").is_file():
        raise ValueError("STATIC_SITE_DIR must contain a built website")
    site = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    @site.middleware("http")
    async def security_headers(request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    site.mount("/api", api)
    site.mount("/", SiteFiles(directory=directory, html=True))
    return site


api = create_app()
app = site_app(api, os.environ["STATIC_SITE_DIR"]) if os.environ.get("STATIC_SITE_DIR") else api
