from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.billing import router as billing_router
from app.api.cases import router as cases_router
from app.api.findings import router as findings_router
from app.api.policy import router as policy_router
from app.api.upload import router as upload_router
from app.api.user import router as user_router
from app.core.config import settings
from app.db.session import engine
from app.models import billing as _billing  # noqa: F401
from app.models import case as _case  # noqa: F401
from app.models import policy as _policy  # noqa: F401
from app.models import user as _user  # noqa: F401
from app.db.base import Base


def create_app() -> FastAPI:
    app = FastAPI(title="AirScan API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_url, "http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"] ,
    )

    app.include_router(upload_router, prefix="/api")
    app.include_router(cases_router, prefix="/api")
    app.include_router(findings_router, prefix="/api")
    app.include_router(policy_router, prefix="/api")
    app.include_router(user_router, prefix="/api")
    app.include_router(billing_router, prefix="/api")

    @app.get("/health")
    def health():
        return {"ok": True}

    return app


app = create_app()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    import uvicorn

    init_db()
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
