"""
OCR Service — Extracts First Name, Last Name, Course, and SR-Code from student ID.
Restricted to the registration form only.
"""

import re
import pytesseract
from PIL import Image
from config import Config

pytesseract.pytesseract.tesseract_cmd = Config.TESSERACT_CMD


def extract_student_id_info(image_file) -> dict:
    """
    Accept an image file of a student ID card and extract:
    - first_name
    - last_name
    - course
    - sr_code
    """
    image = Image.open(image_file)

    # TODO: add image pre-processing (binarization, contrast enhancement, ROI extraction)
    raw_text = pytesseract.image_to_string(image)

    sr_code = _extract_sr_code(raw_text)
    first_name, last_name = _extract_name(raw_text)
    course = _extract_course(raw_text)

    return {
        "raw_text": raw_text,
        "first_name": first_name or "",
        "last_name": last_name or "",
        "sr_code": sr_code or "",
        "course": course or "",
        "confidence": 0.0,  # TODO: compute from pytesseract image_to_data
    }


def _extract_sr_code(text: str) -> str | None:
    """Matches SR-Code patterns such as '20-12345' or '19-54321'."""
    match = re.search(r"\b\d{2}-\d{4,6}\b", text)
    return match.group(0) if match else None


def _extract_name(text: str) -> tuple[str | None, str | None]:
    """
    Extract first and last name from student ID card text.
    TODO: customize regex / bounding box logic for university ID layout.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines:
        parts = lines[0].split()
        if len(parts) >= 2:
            return parts[0], " ".join(parts[1:])
    return None, None


def _extract_course(text: str) -> str | None:
    """
    Extract degree/course abbreviation like BSCS, BSIT, BSCE, BSEE, etc.
    """
    match = re.search(r"\b(BSCS|BSIT|BSCE|BSEE|BSME|BSIE|BSBA|BSA)\b", text, re.IGNORECASE)
    return match.group(0).upper() if match else None
