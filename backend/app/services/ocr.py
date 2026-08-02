"""
OCR service (the 'stretch goal' from the brief).
Given a base64-encoded cropped frame image, saves it to disk and runs
Tesseract OCR on it to pre-fill extracted_text. If Tesseract is not
installed on the machine, this fails gracefully and just skips OCR -
the annotation is still saved fine, extracted_text stays empty and the
user can type it manually.
"""
import os
import base64
import uuid
from PIL import Image
import io

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CROPS_DIR = os.path.join(BASE_DIR, "downloads", "crops")
os.makedirs(CROPS_DIR, exist_ok=True)


def save_crop_and_run_ocr(video_id: int, crop_image_base64: str) -> tuple[str, str]:
    """
    Returns (thumbnail_path, extracted_text).
    crop_image_base64 is expected to be a data URL like
    'data:image/png;base64,iVBORw0...'
    """
    if "," in crop_image_base64:
        header, b64data = crop_image_base64.split(",", 1)
    else:
        b64data = crop_image_base64

    image_bytes = base64.b64decode(b64data)
    filename = f"{video_id}_{uuid.uuid4().hex[:10]}.png"
    filepath = os.path.join(CROPS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(image_bytes)

    extracted_text = ""
    try:
        import pytesseract
        img = Image.open(io.BytesIO(image_bytes))
        extracted_text = pytesseract.image_to_string(img, lang="eng").strip()
    except Exception:
        # Tesseract binary might not be installed on this machine yet -
        # see README for install instructions. Annotation save should
        # never fail just because OCR isn't available.
        extracted_text = ""

    return filepath, extracted_text
