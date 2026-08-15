"""
OCR Service — Extracts First Name, Last Name, Course, and SR-Code from student ID.
Restricted to the registration form only.
"""

import re
import pytesseract
from PIL import Image
from config import Config

pytesseract.pytesseract.tesseract_cmd = Config.TESSERACT_CMD


def determine_department(course: str) -> str:
    if not course:
        return "CICS"
    c = course.upper()
    if any(k in c for k in ["IT", "CS", "INFORMATION TECHNOLOGY", "COMPUTER SCIENCE", "INFORMATICS", "BSIT", "BSCS"]):
        return "CICS"
    if any(k in c for k in ["CET", "ENGINEERING TECHNOLOGY", "INDUSTRIAL TECHNOLOGY", "BSET"]):
        return "CET"
    if any(k in c for k in ["COE", "ENGINEERING", "BSCE", "BSEE", "BSME", "BSIE", "BSCOE"]):
        return "COE"
    if any(k in c for k in ["CAFAD", "ARCHITECTURE", "FINE ARTS", "DESIGN", "BSA"]):
        return "CAFAD"
    if any(k in c for k in ["CAS", "ARTS", "SCIENCE", "PSYCHOLOGY", "CRIMINOLOGY"]):
        return "CAS"
    if any(k in c for k in ["CBA", "BUSINESS", "ACCOUNTANCY", "MANAGEMENT", "BSBA"]):
        return "CBA"
    return "CICS"


def extract_student_id_info(image_file) -> dict:
    """
    Accept an image file of a student ID card and extract:
    - first_name
    - last_name
    - mi
    - course
    - department
    - sr_code
    """
    image = Image.open(image_file)
    if image.mode != "RGB":
        image = image.convert("RGB")

    try:
        raw_text = pytesseract.image_to_string(image)
    except Exception as e:
        raw_text = ""

    sr_code = _extract_sr_code(raw_text) or ""
    first_name, last_name, mi = _extract_name(raw_text)
    course = _extract_course(raw_text) or ""
    department = determine_department(course)

    return {
        "raw_text": raw_text,
        "first_name": first_name or "",
        "firstName": first_name or "",
        "last_name": last_name or "",
        "lastName": last_name or "",
        "mi": mi or "",
        "sr_code": sr_code or "",
        "srCode": sr_code or "",
        "course": course or "",
        "department": department or "CICS",
        "dept": department or "CICS",
        "year_level": "1st Year",
        "yearLevel": "1st Year",
        "section": "1101",
    }


def _extract_sr_code(text: str) -> str | None:
    """Matches SR-Code patterns such as '20-12345' or '19-54321' or '21-67890'."""
    match = re.search(r"\b\d{2}-\d{4,6}\b", text)
    return match.group(0) if match else None


def _extract_name(text: str) -> tuple[str | None, str | None, str | None]:
    """
    Extract first name, last name, and middle initial from student ID text.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    first_name, last_name, mi = "", "", ""

    for line in lines:
        # Ignore lines with obvious labels or university headers
        if any(h in line.upper() for h in ["BATANGAS", "STATE", "UNIVERSITY", "STUDENT", "ID", "CARD", "REPUBLIC", "CAMPUS"]):
            continue
        parts = [p for p in line.split() if p.isalpha() and len(p) >= 2]
        if len(parts) >= 2 and not first_name:
            first_name = parts[0]
            last_name = parts[-1]
            if len(parts) > 2:
                mi = parts[1][0] if len(parts[1]) > 0 else ""
            break

    return first_name, last_name, mi


def _extract_course(text: str) -> str | None:
    """
    Extract degree/course abbreviation like BSCS, BSIT, BSCE, BSEE, etc.
    """
    match = re.search(r"\b(BSCS|BSIT|BSCE|BSEE|BSME|BSIE|BSBA|BSA|BSHM|BSTM|BSEd|BSED|BSN)\b", text, re.IGNORECASE)
    if match:
        return match.group(0).upper()
    if "COMPUTER SCIENCE" in text.upper():
        return "BSCS"
    if "INFORMATION TECHNOLOGY" in text.upper():
        return "BSIT"
    if "CIVIL ENGINEERING" in text.upper():
        return "BSCE"
    return None

