"""
WildfireWatch FastAPI Backend
Main application entry point.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# Import routers
from routers import detection, demo, admin, research
from db.turso import init_schema
from ml.inference import set_active_model

TEMP_DIR = os.getenv("TEMP_DIR", "/tmp")
os.makedirs(TEMP_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown events."""
    print("[Startup] Initializing WildfireWatch backend...")

    # Initialize database schema
    try:
        await init_schema()
        print("[Startup] Database schema initialized")
    except Exception as e:
        print(f"[Startup] DB init warning: {e}")

    # Load active model into memory
    try:
        from db.turso import execute
        from storage.r2 import download_file, check_r2_configured

        result = await execute("SELECT id, file_path FROM models WHERE is_active = 1 LIMIT 1")
        if result.rows:
            row = result.rows[0]
            model_id, r2_key = row[0], row[1]
            local_path = os.path.join(TEMP_DIR, f"model_{model_id}.keras")

            if os.path.exists(local_path):
                set_active_model(local_path)
                print(f"[Startup] Active model loaded from cache: {model_id}")
            elif check_r2_configured():
                print(f"[Startup] Downloading active model {model_id} from R2...")
                await download_file(r2_key, local_path)
                set_active_model(local_path)
                print(f"[Startup] Active model loaded: {model_id}")
            else:
                print("[Startup] No R2 configured and no cached model — skipping model load")
        else:
            print("[Startup] No active model in database")
    except Exception as e:
        print(f"[Startup] Model loading warning: {e}")

    yield

    print("[Shutdown] WildfireWatch backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="WildfireWatch API",
    description="MLOps platform for AI-powered wildfire detection from video footage",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", "https://wildfirewatch.vercel.app"),
    # Add your Vercel domain here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(detection.router)
app.include_router(demo.router)
app.include_router(admin.router)
app.include_router(research.router)


@app.get("/")
async def root():
    return {
        "service": "WildfireWatch API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    from ml.inference import get_model
    model_loaded = get_model() is not None
    return {
        "status": "healthy",
        "model_loaded": model_loaded,
    }
