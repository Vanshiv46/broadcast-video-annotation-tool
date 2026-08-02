"""
/annotations endpoints:
  POST   /annotations              - save a new bbox annotation (with optional OCR)
  GET    /annotations?video_id=..  - list annotations, optionally filtered by video
  PATCH  /annotations/{id}         - edit extracted_text / label (manual audit)
  DELETE /annotations/{id}         - remove one annotation

Every annotation is committed to the DB immediately on save, so there's
no in-memory draft state that could be lost on a page refresh/crash.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from .. import models, schemas
from ..services.ocr import save_crop_and_run_ocr

router = APIRouter(prefix="/annotations", tags=["annotations"])


@router.post("", response_model=schemas.AnnotationOut)
def create_annotation(payload: schemas.AnnotationCreate, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == payload.video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    thumbnail_path = None
    extracted_text = payload.extracted_text

    if payload.crop_image_base64:
        thumbnail_path, ocr_text = save_crop_and_run_ocr(
            payload.video_id, payload.crop_image_base64
        )
        # only auto-fill from OCR if the user didn't already type something
        if not extracted_text:
            extracted_text = ocr_text

    annotation = models.Annotation(
        video_id=payload.video_id,
        timestamp_sec=payload.timestamp_sec,
        bbox_x=payload.bbox_x,
        bbox_y=payload.bbox_y,
        bbox_w=payload.bbox_w,
        bbox_h=payload.bbox_h,
        label=payload.label,
        extracted_text=extracted_text,
        thumbnail_path=thumbnail_path,
        created_by=payload.created_by,
    )
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


@router.get("", response_model=list[schemas.AnnotationOut])
def list_annotations(video_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.Annotation)
    if video_id is not None:
        query = query.filter(models.Annotation.video_id == video_id)
    return query.order_by(models.Annotation.timestamp_sec.asc()).all()


@router.patch("/{annotation_id}", response_model=schemas.AnnotationOut)
def update_annotation(
    annotation_id: int, payload: schemas.AnnotationUpdate, db: Session = Depends(get_db)
):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")

    if payload.extracted_text is not None:
        annotation.extracted_text = payload.extracted_text
    if payload.label is not None:
        annotation.label = payload.label

    db.commit()
    db.refresh(annotation)
    return annotation


@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: int, db: Session = Depends(get_db)):
    annotation = db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    db.delete(annotation)
    db.commit()
    return {"ok": True}
