from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.settings import settings
from app.models.database import init_db
from app.routes import api, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting Takalam API...")
    init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("Shutting down Takalam API...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Takalam - Assistant vocal bienveillant pour l'apprentissage de l'arabe",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        "*"  # TODO: Restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api.router)
app.include_router(websocket.router)


@app.get("/")
def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Takalam API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
