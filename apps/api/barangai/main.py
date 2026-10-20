import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles

from . import models
from .auth import attempts, router as auth_router
from .db import Base, database_url, engine_for_url
from .reports import router as reports_router
from .workflow import router as workflow_router
from .fallbacks import router as fallbacks_router
from .duplicates import router as duplicates_router
from .body_limit import ReportBodyLimitMiddleware
from .inference import validate_configured_model
from .notifications import router as notifications_router
from .media import validate_storage_config
from .google_auth import router as google_router


def create_app():
    validate_configured_model()
    validate_storage_config()
    app = FastAPI(title="BarangAI Watch API", root_path=os.environ.get("API_ROOT_PATH", ""))
    attempts.clear()

    @app.middleware("http")
    async def reject_forged_role(request: Request, call_next):
        path = request.scope["path"].removeprefix(request.scope.get("root_path", ""))
        if path == "/auth/register" and request.method == "POST":
            body = await request.body()
            import json
            try:
                supplied_role = "role" in json.loads(body)
            except (ValueError, TypeError):
                supplied_role = False
            if supplied_role:
                from fastapi.responses import JSONResponse
                return JSONResponse({"detail": "Role cannot be selected"}, status_code=403)
        return await call_next(request)

    if database_url().startswith("sqlite"):
        Base.metadata.create_all(engine_for_url(database_url()))
    app.include_router(auth_router)
    app.include_router(google_router)
    app.include_router(reports_router)
    app.include_router(workflow_router)
    app.include_router(fallbacks_router)
    app.include_router(duplicates_router)
    app.include_router(notifications_router)
    app.add_middleware(ReportBodyLimitMiddleware)

    @app.get("/health", include_in_schema=False)
    def health():
        return {"status": "ok"}

    return app


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
    site.mount("/", StaticFiles(directory=directory, html=True))
    return site


api = create_app()
app = site_app(api, os.environ["STATIC_SITE_DIR"]) if os.environ.get("STATIC_SITE_DIR") else api
