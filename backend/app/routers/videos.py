"""
/videos endpoints:
  POST   /videos            - add a single YouTube URL, download in background
  POST   /videos/batch      - add many URLs at once (for the 30+ video requirement)
  GET    /videos            - list all videos + their status
  GET    /videos/{id}       - get one video
  DELETE /videos/{id}       - remove a video + its annotations
"""
import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.downloader import download_video

router = APIRouter(prefix="/videos", tags=["videos"])


def _run_download(video_id: int):
    """Background task: downloads the video and updates its DB row."""
    from ..database import SessionLocal
    db = SessionLocal()
    try:
        video = db.query(models.Video).filter(models.Video.id == video_id).first()
        if not video:
            return
        video.status = "downloading"
        db.commit()

        try:
            info = download_video(video.youtube_url, video.id)
            video.title = info["title"]
            video.duration_sec = info["duration_sec"]
            video.local_path = info["local_path"]
            video.thumbnail_path = info["thumbnail_path"]
            video.status = "ready"
            video.processed_at = datetime.datetime.utcnow()
            video.error_message = None
        except Exception as e:
            video.status = "failed"
            video.error_message = str(e)

        db.commit()
    finally:
        db.close()


@router.post("", response_model=schemas.VideoOut)
def create_video(
    payload: schemas.VideoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    video = models.Video(youtube_url=payload.youtube_url, status="pending")
    db.add(video)
    db.commit()
    db.refresh(video)

    background_tasks.add_task(_run_download, video.id)
    return video


@router.post("/batch")
def create_videos_batch(
    payload: schemas.BatchIngestRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Bulk-add many YouTube URLs at once - handles the '30+ videos' requirement."""
    created_ids = []
    for url in payload.urls:
        url = url.strip()
        if not url:
            continue
        video = models.Video(youtube_url=url, status="pending")
        db.add(video)
        db.commit()
        db.refresh(video)
        created_ids.append(video.id)
        background_tasks.add_task(_run_download, video.id)

    return {"created": len(created_ids), "video_ids": created_ids}


@router.get("", response_model=list[schemas.VideoOut])
def list_videos(db: Session = Depends(get_db)):
    return db.query(models.Video).order_by(models.Video.created_at.desc()).all()


@router.get("/{video_id}", response_model=schemas.VideoOut)
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video


@router.delete("/{video_id}")
def delete_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    db.delete(video)
    db.commit()
    return {"ok": True}
