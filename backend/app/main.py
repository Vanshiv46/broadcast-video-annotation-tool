"""
FastAPI entrypoint.
Run with:  uvicorn app.main:app --reload --port 8000
Docs auto-generated at: http://localhost:8000/docs
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import videos, annotations

# Creates videos + annotations tables on first run if they don't exist yet.
# Safe to call every startup - it never drops/overwrites existing data.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Broadcast Video Annotation Tool")

# Allow the Vite dev server (localhost:5173) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)
app.include_router(annotations.router)

# Serve downloaded videos/thumbnails/crops as static files so the
# frontend <video> tag and <img> tags can load them directly, e.g.
# http://localhost:8000/media/1_abc123.mp4
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=DOWNLOAD_DIR), name="media")


@app.get("/")
def health_check():
    return {"status": "ok", "service": "video-annotation-tool-backend"}
