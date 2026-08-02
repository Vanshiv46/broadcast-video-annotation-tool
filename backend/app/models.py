"""
SQLAlchemy ORM models -> these define the 'videos' and 'annotations'
tables described in the project brief.
"""
from sqlalchemy import (
    Column, Integer, String, Float, Text, ForeignKey, DateTime, func
)
from sqlalchemy.orm import relationship
from .database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    youtube_url = Column(String, nullable=False)
    title = Column(String, nullable=True)
    duration_sec = Column(Integer, nullable=True)
    local_path = Column(String, nullable=True)       # path to downloaded mp4
    thumbnail_path = Column(String, nullable=True)    # video-level thumbnail
    status = Column(String, default="pending")        # pending/downloading/ready/failed
    error_message = Column(Text, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    annotations = relationship(
        "Annotation", back_populates="video", cascade="all, delete-orphan"
    )


class Annotation(Base):
    __tablename__ = "annotations"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    timestamp_sec = Column(Float, nullable=False)

    # bbox coords stored NORMALIZED (0-1), so they stay correct
    # no matter what resolution the video is displayed at.
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)

    label = Column(String, default="text_block")  # text_block / object / keyframe
    extracted_text = Column(Text, nullable=True)
    thumbnail_path = Column(String, nullable=True)  # cropped frame saved as image file
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="annotations")
