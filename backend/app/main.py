import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.settings import settings
from app.models.database import init_db
from app.routes import api, websocket, auth

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Takalam API...")
    init_db()
    logger.info("Database initialized")
    yield
    logger.info("Shutting down Takalam API...")


app = FastAPI(
    title=settings.APP_NAME,
    description="Takalam - Assistant vocal bienveillant pour l'apprentissage de l'arabe",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(api.router)
app.include_router(websocket.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Takalam API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=settings.DEBUG)
