"""
Pydantic schemas -> control exactly what shape of JSON goes in/out of the API.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# ---------- Video schemas ----------

class VideoCreate(BaseModel):
    youtube_url: str


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    youtube_url: str
    title: Optional[str] = None
    duration_sec: Optional[int] = None
    local_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    processed_at: Optional[datetime] = None
    created_at: datetime


# ---------- Annotation schemas ----------

class AnnotationCreate(BaseModel):
    video_id: int
    timestamp_sec: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    label: str = "text_block"
    extracted_text: Optional[str] = None
    created_by: Optional[str] = None
    # base64 data URL of the cropped region, sent from the canvas.
    # optional - if omitted, no thumbnail/OCR is generated.
    crop_image_base64: Optional[str] = None


class AnnotationUpdate(BaseModel):
    extracted_text: Optional[str] = None
    label: Optional[str] = None


class AnnotationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    video_id: int
    timestamp_sec: float
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    label: str
    extracted_text: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class BatchIngestRequest(BaseModel):
    urls: list[str]
