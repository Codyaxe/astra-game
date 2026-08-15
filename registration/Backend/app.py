import os
import re
import json
import sqlite3
import sys
import uuid
from datetime import datetime

# Force UTF-8 stdout encoding for Windows console compatibility
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import cv2
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps

# OCR Engines setup
import easyocr
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

# MySQL setup
try:
    import mysql.connector
    MYSQL_AVAILABLE = True
except ImportError:
    MYSQL_AVAILABLE = False

# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------

DEBUG_IMAGE_PATH = os.path.join(os.path.dirname(__file__), "debug_last_scan.jpg")
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "bsu_registration.db")

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "bsu_registration",
}

# Global DB status indicator
ACTIVE_DB_TYPE = "unknown"

# Lazy-loaded EasyOCR instance
_ocr_reader_instance = None

def get_ocr_reader():
    global _ocr_reader_instance
    if _ocr_reader_instance is None:
        print("[INIT] Loading EasyOCR model (verbose=False)...")
        _ocr_reader_instance = easyocr.Reader(["en"], gpu=False, verbose=False)
        print("[INIT] EasyOCR model loaded successfully.")
    return _ocr_reader_instance

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# DATABASE ADAPTER (MySQL with SQLite Fallback)
# ---------------------------------------------------------------------------

def get_db_connection():
    global ACTIVE_DB_TYPE
    if MYSQL_AVAILABLE:
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            ACTIVE_DB_TYPE = "mysql"
            return conn, "mysql"
        except Exception:
            pass

    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    ACTIVE_DB_TYPE = "sqlite"
    return conn, "sqlite"


def init_db():
    conn, db_type = get_db_connection()
    cur = conn.cursor()
    
    if db_type == "mysql":
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_token VARCHAR(36) NOT NULL UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                mi VARCHAR(5),
                sr_code VARCHAR(20) NOT NULL UNIQUE,
                department VARCHAR(20),
                course VARCHAR(100),
                year_level VARCHAR(20),
                section VARCHAR(50),
                registration_method VARCHAR(20) DEFAULT 'manual',
                attempts_used INT DEFAULT 0,
                created_at DATETIME NOT NULL
            )
            """
        )
        for col_name, col_def in [
            ('ticket_token', "VARCHAR(36) NOT NULL DEFAULT ''"),
            ('registration_method', "VARCHAR(20) DEFAULT 'manual'"),
            ('attempts_used', "INT DEFAULT 0"),
            ('year_level', "VARCHAR(20)"),
            ('section', "VARCHAR(50)")
        ]:
            try:
                cur.execute(f"SHOW COLUMNS FROM registrations LIKE '{col_name}'")
                if not cur.fetchone():
                    print(f"[DB] Adding missing column '{col_name}' to MySQL table...")
                    cur.execute(f"ALTER TABLE registrations ADD COLUMN {col_name} {col_def}")
                    # Back-fill existing rows with a unique token
                    if col_name == 'ticket_token':
                        cur.execute("SELECT id FROM registrations WHERE ticket_token = '' OR ticket_token IS NULL")
                        rows = cur.fetchall()
                        for (rid,) in rows:
                            cur.execute("UPDATE registrations SET ticket_token = %s WHERE id = %s", (str(uuid.uuid4()), rid))
            except Exception as e:
                print(f"[DB MIGRATION ERROR] {e}")

    else: # sqlite
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS registrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_token TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                mi TEXT,
                sr_code TEXT NOT NULL UNIQUE,
                department TEXT,
                course TEXT,
                year_level TEXT,
                section TEXT,
                registration_method TEXT DEFAULT 'manual',
                attempts_used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        try:
            cur.execute("PRAGMA table_info(registrations)")
            columns = [column[1] for column in cur.fetchall()]
            for col_name, col_def in [
                ('ticket_token', "TEXT NOT NULL DEFAULT ''"),
                ('registration_method', "TEXT DEFAULT 'manual'"),
                ('attempts_used', "INTEGER DEFAULT 0"),
                ('year_level', "TEXT"),
                ('section', "TEXT")
            ]:
                if col_name not in columns:
                    print(f"[DB] Adding missing column '{col_name}' to SQLite table...")
                    cur.execute(f"ALTER TABLE registrations ADD COLUMN {col_name} {col_def}")
                    # Back-fill existing rows with a unique token
                    if col_name == 'ticket_token':
                        cur.execute("SELECT id FROM registrations WHERE ticket_token = '' OR ticket_token IS NULL")
                        rows = cur.fetchall()
                        for row in rows:
                            cur.execute("UPDATE registrations SET ticket_token = ? WHERE id = ?", (str(uuid.uuid4()), row[0]))
        except Exception as e:
            print(f"[DB MIGRATION ERROR] {e}")
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"[DB] Initialized database using engine: {db_type.upper()}")


# ---------------------------------------------------------------------------
# DEPARTMENT DETERMINATION
# ---------------------------------------------------------------------------

def determine_department(course):
    if not course:
        return ""
    c = course.lower()
    if "information technology" in c or "computer science" in c or "informatics" in c:
        return "CICS"
    if "engineering technology" in c or "industrial technology" in c:
        return "CET"
    if "engineering" in c:
        return "COE"
    if "architecture" in c or "fine arts" in c or "design" in c:
        return "CAFAD"
    if "arts" in c or "science" in c or "psychology" in c or "criminology" in c:
        return "CAS"
    if "business" in c or "accountancy" in c or "management" in c:
        return "CBA"
    return "CICS"


# ---------------------------------------------------------------------------
# IMAGE PREPROCESSING & QR CODE DECODER
# ---------------------------------------------------------------------------

def prepare_image(file_stream):
    image = Image.open(file_stream)
    image = ImageOps.exif_transpose(image)

    if image.mode != "RGB":
        image = image.convert("RGB")

    long_side = max(image.width, image.height)
    if long_side < 1500:
        scale = 1500 / long_side
        image = image.resize(
            (int(image.width * scale), int(image.height * scale)),
            Image.Resampling.LANCZOS,
        )
    elif long_side > 2200:
        scale = 2200 / long_side
        image = image.resize(
            (int(image.width * scale), int(image.height * scale)),
            Image.Resampling.LANCZOS,
        )

    image.save(DEBUG_IMAGE_PATH)
    return image


def decode_qr_code(image):
    try:
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        detector = cv2.QRCodeDetector()
        data, bbox, _ = detector.detectAndDecode(cv_img)
        
        if not data:
            gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
            data, bbox, _ = detector.detectAndDecode(gray)

        if not data:
            return None

        print(f"[QR] Found QR Code raw content: {data!r}")

        # 1. JSON format check
        try:
            parsed = json.loads(data)
            if isinstance(parsed, dict):
                first_name = parsed.get("firstName") or parsed.get("first_name") or ""
                last_name = parsed.get("lastName") or parsed.get("last_name") or ""
                mi = parsed.get("mi") or parsed.get("middle_initial") or ""
                sr_code = parsed.get("srCode") or parsed.get("sr_code") or ""
                course = parsed.get("course") or ""
                dept = parsed.get("dept") or parsed.get("department") or determine_department(course)
                
                return {
                    "first_name": first_name.strip(),
                    "last_name": last_name.strip(),
                    "mi": mi.strip(),
                    "sr_code": sr_code.strip(),
                    "course": course.strip(),
                    "department": dept.strip(),
                    "raw_qr": data,
                }
        except Exception:
            pass

        # 2. Delimited format check (Pipe '|' or Comma ',')
        parts = [p.strip() for p in re.split(r"[|,\n]", data) if p.strip()]
        if len(parts) >= 2:
            extracted = {"raw_qr": data}
            for part in parts:
                sr_match = re.search(r"(\d{2}-\d{4,6})", part)
                if sr_match and "sr_code" not in extracted:
                    extracted["sr_code"] = sr_match.group(1)
                elif re.match(r"^BS\b", part, re.I) and "course" not in extracted:
                    extracted["course"] = part
                    extracted["department"] = determine_department(part)
                elif part in ["CICS", "COE", "CET", "CAFAD", "CAS", "CBA"] and "department" not in extracted:
                    extracted["department"] = part
            
            if "sr_code" in extracted and len(parts) >= 3:
                if "first_name" not in extracted and len(parts) > 1:
                    extracted["first_name"] = parts[1]
                if "last_name" not in extracted and len(parts) > 2:
                    extracted["last_name"] = parts[2]
            
            if "sr_code" in extracted:
                return extracted

        # 3. Plain SR Code search
        sr_match = re.search(r"(\d{2}-\d{4,6})", data)
        if sr_match:
            return {
                "sr_code": sr_match.group(1),
                "raw_qr": data,
            }

        return {"raw_qr": data}

    except Exception as e:
        print(f"[QR ERROR] Exception during QR decoding: {e}")
        return None


# ---------------------------------------------------------------------------
# OCR + TEXT PARSING ENGINE
# ---------------------------------------------------------------------------

def run_ocr(image):
    np_image = np.array(image)
    reader = get_ocr_reader()
    raw_results = reader.readtext(np_image)

    words = []
    for bbox, text, conf in raw_results:
        text = text.strip()
        if not text or conf < 0.30:
            continue
        xs = [p[0] for p in bbox]
        ys = [p[1] for p in bbox]
        words.append(
            {
                "text": text,
                "conf": conf,
                "x": sum(xs) / 4,
                "y": sum(ys) / 4,
                "height": max(ys) - min(ys),
            }
        )

    if len(words) < 3 and PYTESSERACT_AVAILABLE:
        print("[OCR] EasyOCR returned few results; trying PyTesseract fallback...")
        try:
            tess_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            n_boxes = len(tess_data["text"])
            words = []
            for i in range(n_boxes):
                text = tess_data["text"][i].strip()
                if not text:
                    continue
                x, y, w, h = tess_data["left"][i], tess_data["top"][i], tess_data["width"][i], tess_data["height"][i]
                words.append({
                    "text": text,
                    "conf": float(tess_data["conf"][i]) / 100.0 if tess_data["conf"][i] != "-1" else 0.5,
                    "x": x + w / 2,
                    "y": y + h / 2,
                    "height": h,
                })
        except Exception as te:
            print(f"[OCR] PyTesseract error: {te}")

    words.sort(key=lambda w: w["y"])
    return words


def group_into_lines(words):
    lines = []
    for w in words:
        placed = False
        for line in lines:
            if abs(line["y"] - w["y"]) < max(w["height"], line["height"]) * 0.6:
                line["words"].append(w)
                line["y"] = sum(x["y"] for x in line["words"]) / len(line["words"])
                line["height"] = max(line["height"], w["height"])
                placed = True
                break
        if not placed:
            lines.append({"y": w["y"], "height": w["height"], "words": [w]})

    for line in lines:
        line["words"].sort(key=lambda w: w["x"])
        line["text"] = " ".join(w["text"] for w in line["words"])

    lines.sort(key=lambda l: l["y"])
    return lines


def find_course_line_index(lines):
    for i, line in enumerate(lines):
        cleaned = re.sub(r"[^A-Za-z\s]", " ", line["text"])
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if re.match(r"^(bs|bachelor|associate)\b", cleaned, re.IGNORECASE):
            words = cleaned.split()
            course = words[0].upper() + " " + " ".join(w.capitalize() for w in words[1:])
            return i, course

    return None, None


def parse_first_name_line(text):
    words = re.sub(r"[^A-Za-z.\s]", "", text).split()
    if not words:
        return "", ""
    mi = ""
    if re.fullmatch(r"[A-Za-z]\.?", words[-1]):
        mi = words[-1].rstrip(".").upper()
        words = words[:-1]
    first_name = " ".join(w.capitalize() for w in words)
    return first_name, mi


def parse_last_name_line(text):
    words = re.sub(r"[^A-Za-z\s]", "", text).split()
    return " ".join(w.capitalize() for w in words)


def extract_sr_code(words):
    full_text = " ".join(w["text"] for w in words)

    match = re.search(r"(\d{2}-\d{4,6})", full_text)
    if match:
        return match.group(1)

    match = re.search(r"(\d{2})\D(\d{4,6})", full_text)
    if match:
        return f"{match.group(1)}-{match.group(2)}"

    digits_only = re.sub(r"\D", "", full_text)
    match = re.search(r"(\d{6,8})", digits_only)
    if match:
        digits = match.group(1)
        return f"{digits[:2]}-{digits[2:]}"

    return None


# ---------------------------------------------------------------------------
# API ROUTES
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "active_database": ACTIVE_DB_TYPE,
        "ocr_engine": "EasyOCR" if not PYTESSERACT_AVAILABLE else "EasyOCR + PyTesseract",
        "qr_detector": "OpenCV QRCodeDetector",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/extract-id", methods=["POST"])
def extract_id():
    if "photo" not in request.files:
        return jsonify({"error": "No photo uploaded"}), 400

    image = prepare_image(request.files["photo"].stream)
    
    # 1. Attempt QR Code extraction first
    qr_data = decode_qr_code(image) or {}
    
    # 2. Attempt OCR extraction
    words = run_ocr(image)
    lines = group_into_lines(words)

    course_idx, course_ocr = find_course_line_index(lines)

    first_name_ocr, last_name_ocr, mi_ocr = "", "", ""
    if course_idx is not None and course_idx >= 2:
        last_name_ocr = parse_last_name_line(lines[course_idx - 1]["text"])
        first_name_ocr, mi_ocr = parse_first_name_line(lines[course_idx - 2]["text"])

    sr_code_ocr = extract_sr_code(words)
    dept_ocr = determine_department(course_ocr) if course_ocr else ""

    # 3. Combine QR and OCR results
    first_name = qr_data.get("first_name") or first_name_ocr
    last_name = qr_data.get("last_name") or last_name_ocr
    mi = qr_data.get("mi") or mi_ocr
    sr_code = qr_data.get("sr_code") or sr_code_ocr or ""
    course = qr_data.get("course") or course_ocr or ""
    department = qr_data.get("department") or dept_ocr or determine_department(course)

    extraction_source = "QR Code & OCR" if qr_data and (first_name_ocr or sr_code_ocr) else ("QR Code" if qr_data else "OCR Engine")

    return jsonify({
        "first_name": first_name,
        "last_name": last_name,
        "mi": mi,
        "sr_code": sr_code,
        "course": course,
        "department": department,
        "extraction_source": extraction_source,
        "qr_detected": bool(qr_data),
    })


@app.route("/scan-qr", methods=["POST"])
def scan_qr_endpoint():
    if "photo" not in request.files:
        return jsonify({"error": "No QR photo uploaded"}), 400

    image = prepare_image(request.files["photo"].stream)
    qr_data = decode_qr_code(image)

    if not qr_data:
        return jsonify({"error": "No valid QR code detected in the uploaded image"}), 404

    return jsonify({
        "status": "success",
        "data": qr_data
    })


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(force=True) if request.is_json else request.form
    
    first_name = (data.get("firstName") or data.get("first_name") or "").strip()
    last_name = (data.get("lastName") or data.get("last_name") or "").strip()
    mi = (data.get("mi") or "").strip()
    sr_code = (data.get("srCode") or data.get("sr_code") or "").strip()
    dept = (data.get("dept") or data.get("department") or "").strip()
    course = (data.get("course") or "").strip()
    year_level = (data.get("yearLevel") or data.get("year_level") or "").strip()
    section = (data.get("section") or data.get("blockSection") or data.get("block_section") or "").strip()
    method = (data.get("method") or "mobile_form").strip()

    missing = []
    if not first_name: missing.append("First Name")
    if not last_name: missing.append("Last Name")
    if not sr_code: missing.append("SR-Code")
    
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    sr_code_clean = re.sub(r"\s+", "", sr_code)
    conn, db_type = get_db_connection()
    cur = conn.cursor()

    try:
        if db_type == "mysql":
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, year_level, section, ticket_token FROM registrations WHERE sr_code = %s", (sr_code_clean,))
            existing = cur.fetchone()
        else:
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, year_level, section, ticket_token FROM registrations WHERE sr_code = ?", (sr_code_clean,))
            existing = cur.fetchone()

        if existing:
            cur.close()
            conn.close()
            existing_id, e_first, e_last, e_mi, e_sr, e_dept, e_course, e_attempts = existing[:8]
            e_year = existing[8] if len(existing) > 8 else ""
            e_sec = existing[9] if len(existing) > 9 else ""
            e_token = existing[10] if len(existing) > 10 else ""
            attempts_count = e_attempts if e_attempts is not None else 0
            print(f"[REGISTER RETRIEVE] SR-Code {sr_code_clean} is already registered (ID #{existing_id}). Returning existing ticket.")
            return jsonify({
                "status": "already_registered",
                "already_registered": True,
                "message": f"Welcome back! SR-Code {sr_code_clean} is already registered.",
                "id": existing_id,
                "ticket_token": e_token or "",
                "sr_code": e_sr,
                "first_name": e_first,
                "last_name": e_last,
                "mi": e_mi or "",
                "department": e_dept or "",
                "course": e_course or "",
                "year_level": e_year or "",
                "section": e_sec or "",
                "attempts_used": attempts_count,
                "max_attempts": 3,
                "database_used": db_type,
            }), 200

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_ticket_token = str(uuid.uuid4())

        if db_type == "mysql":
            cur.execute(
                """
                INSERT INTO registrations
                    (ticket_token, first_name, last_name, mi, sr_code, department, course, year_level, section, registration_method, attempts_used, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, %s)
                """,
                (new_ticket_token, first_name, last_name, mi, sr_code_clean, dept, course, year_level, section, method, now_str),
            )
            new_id = cur.lastrowid
        else: # sqlite
            cur.execute(
                """
                INSERT INTO registrations
                    (ticket_token, first_name, last_name, mi, sr_code, department, course, year_level, section, registration_method, attempts_used, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                (new_ticket_token, first_name, last_name, mi, sr_code_clean, dept, course, year_level, section, method, now_str),
            )
            new_id = cur.lastrowid

        conn.commit()
        cur.close()
        conn.close()

        print(f"[REGISTER SUCCESS] Student registered ID #{new_id}: {first_name} {last_name} ({sr_code_clean}) token={new_ticket_token} via {db_type}")
        return jsonify({
            "status": "success",
            "message": "Registration successful!",
            "id": new_id,
            "ticket_token": new_ticket_token,
            "sr_code": sr_code_clean,
            "first_name": first_name,
            "last_name": last_name,
            "mi": mi,
            "department": dept,
            "course": course,
            "year_level": year_level,
            "section": section,
            "attempts_used": 0,
            "max_attempts": 3,
            "database_used": db_type,
        }), 200

    except Exception as e:
        cur.close()
        conn.close()
        print(f"[REGISTER ERROR] {e}")
        return jsonify({"error": f"Failed to save registration: {str(e)}"}), 500


@app.route("/use-attempt", methods=["POST"])
def use_attempt():
    data = request.get_json(force=True) if request.is_json else request.form

    player_id = data.get("id") or data.get("player_id")
    sr_code = (data.get("sr_code") or data.get("srCode") or "").strip()
    ticket_token = (data.get("ticket_token") or "").strip()
    ticket_payload = (data.get("ticket") or "").strip()

    # Parse QR payload: new format BSU-TICKET:<uuid> or legacy BSU-TICKET:<id>:<sr_code>
    if ticket_payload:
        if ticket_payload.startswith("BSU-TICKET:"):
            remainder = ticket_payload[len("BSU-TICKET:"):]
            # UUID format: 8-4-4-4-12 hex groups
            uuid_pattern = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)
            if uuid_pattern.match(remainder):
                ticket_token = remainder
            else:
                # Legacy: BSU-TICKET:<id>:<sr_code>
                parts = remainder.split(":")
                if parts[0].isdigit():
                    player_id = int(parts[0])
                if len(parts) >= 2:
                    sr_code = parts[1]
        else:
            sr_match = re.search(r"(\d{2}-\d{4,6})", ticket_payload)
            if sr_match:
                sr_code = sr_match.group(1)
            elif ticket_payload.isdigit():
                player_id = int(ticket_payload)

    if not player_id and not sr_code and not ticket_token:
        return jsonify({"error": "Missing ticket token, player ID, or SR-Code to punch ticket"}), 400

    conn, db_type = get_db_connection()
    cur = conn.cursor()

    try:
        if db_type == "mysql":
            if ticket_token:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE ticket_token = %s", (ticket_token,))
            elif player_id:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE id = %s", (player_id,))
            else:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE sr_code = %s", (sr_code,))
            row = cur.fetchone()
            player = {
                "id": row[0], "first_name": row[1], "last_name": row[2], "mi": row[3],
                "sr_code": row[4], "department": row[5], "course": row[6],
                "attempts_used": row[7] if row[7] is not None else 0,
                "ticket_token": row[8] if row[8] else ""
            } if row else None
        else: # sqlite
            if ticket_token:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE ticket_token = ?", (ticket_token,))
            elif player_id:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE id = ?", (player_id,))
            else:
                cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used, ticket_token FROM registrations WHERE sr_code = ?", (sr_code,))
            r = cur.fetchone()
            player = {
                "id": r[0], "first_name": r[1], "last_name": r[2], "mi": r[3],
                "sr_code": r[4], "department": r[5], "course": r[6],
                "attempts_used": r[7] if r[7] is not None else 0,
                "ticket_token": r[8] if r[8] else ""
            } if r else None

        if not player:
            cur.close()
            conn.close()
            return jsonify({"status": "denied", "error": "Student registration record not found!"}), 404

        current_attempts = player["attempts_used"]
        max_attempts = 3

        if current_attempts >= max_attempts:
            cur.close()
            conn.close()
            return jsonify({
                "status": "denied",
                "error": f"Ticket expired! Maximum {max_attempts} attempts already used.",
                "attempts_used": current_attempts,
                "attempts_remaining": 0,
                "player": player
            }), 403

        new_attempts = current_attempts + 1
        if db_type == "mysql":
            cur.execute("UPDATE registrations SET attempts_used = %s WHERE id = %s", (new_attempts, player["id"]))
        else:
            cur.execute("UPDATE registrations SET attempts_used = ? WHERE id = ?", (new_attempts, player["id"]))

        conn.commit()
        cur.close()
        conn.close()

        player["attempts_used"] = new_attempts
        print(f"[GAME SESSION] Player #{player['id']} ({player['sr_code']}) started attempt #{new_attempts}/3")
        return jsonify({
            "status": "allowed",
            "message": f"Game session started! (Attempt #{new_attempts} of {max_attempts})",
            "attempts_used": new_attempts,
            "attempts_remaining": max_attempts - new_attempts,
            "player": player
        }), 200

    except Exception as e:
        cur.close()
        conn.close()
        print(f"[TICKET PUNCH ERROR] {e}")
        return jsonify({"error": f"Failed to validate ticket: {str(e)}"}), 500


@app.route("/ticket/<target>", methods=["GET"])
def get_ticket_status(target):
    conn, db_type = get_db_connection()
    cur = conn.cursor()
    
    if db_type == "mysql":
        if target.isdigit():
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used FROM registrations WHERE id = %s", (int(target),))
        else:
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used FROM registrations WHERE sr_code = %s", (target,))
        row = cur.fetchone()
        player = {
            "id": row[0], "first_name": row[1], "last_name": row[2], "mi": row[3],
            "sr_code": row[4], "department": row[5], "course": row[6],
            "attempts_used": row[7] if row[7] is not None else 0
        } if row else None
    else:
        if target.isdigit():
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used FROM registrations WHERE id = ?", (int(target),))
        else:
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, attempts_used FROM registrations WHERE sr_code = ?", (target,))
        r = cur.fetchone()
        player = {
            "id": r[0], "first_name": r[1], "last_name": r[2], "mi": r[3],
            "sr_code": r[4], "department": r[5], "course": r[6],
            "attempts_used": r[7] if r[7] is not None else 0
        } if r else None

    cur.close()
    conn.close()
    if not player:
        return jsonify({"error": "Ticket not found"}), 404
        
    attempts_used = player["attempts_used"]
    max_attempts = 3
    return jsonify({
        "player": player,
        "attempts_used": attempts_used,
        "attempts_remaining": max(0, max_attempts - attempts_used),
        "max_attempts": max_attempts,
        "is_expired": attempts_used >= max_attempts
    })


@app.route("/registrations", methods=["GET"])
def list_registrations():
    search_q = request.args.get("q", "").strip()
    conn, db_type = get_db_connection()
    
    if db_type == "mysql":
        cur = conn.cursor(dictionary=True)
        if search_q:
            like_str = f"%{search_q}%"
            cur.execute(
                "SELECT * FROM registrations WHERE first_name LIKE %s OR last_name LIKE %s OR sr_code LIKE %s OR course LIKE %s ORDER BY id DESC",
                (like_str, like_str, like_str, like_str)
            )
        else:
            cur.execute("SELECT * FROM registrations ORDER BY id DESC")
        rows = cur.fetchall()
        for r in rows:
            if isinstance(r.get("created_at"), datetime):
                r["created_at"] = r["created_at"].isoformat(timespec="seconds")
    else: # sqlite
        cur = conn.cursor()
        if search_q:
            like_str = f"%{search_q}%"
            cur.execute(
                "SELECT id, first_name, last_name, mi, sr_code, department, course, year_level, section, registration_method, attempts_used, ticket_token, created_at FROM registrations WHERE first_name LIKE ? OR last_name LIKE ? OR sr_code LIKE ? OR course LIKE ? ORDER BY id DESC",
                (like_str, like_str, like_str, like_str)
            )
        else:
            cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, year_level, section, registration_method, attempts_used, ticket_token, created_at FROM registrations ORDER BY id DESC")
        raw_rows = cur.fetchall()
        rows = []
        for r in raw_rows:
            rows.append({
                "id": r[0],
                "first_name": r[1],
                "last_name": r[2],
                "mi": r[3],
                "sr_code": r[4],
                "department": r[5],
                "course": r[6],
                "year_level": r[7],
                "section": r[8],
                "registration_method": r[9],
                "attempts_used": r[10] if r[10] is not None else 0,
                "ticket_token": r[11] or "",
                "created_at": r[12],
            })

    cur.close()
    conn.close()
    return jsonify(rows)


@app.route("/registrations/<int:reg_id>/reset", methods=["POST"])
def reset_attempts(reg_id):
    conn, db_type = get_db_connection()
    cur = conn.cursor()
    if db_type == "mysql":
        cur.execute("UPDATE registrations SET attempts_used = 0 WHERE id = %s", (reg_id,))
    else:
        cur.execute("UPDATE registrations SET attempts_used = 0 WHERE id = ?", (reg_id,))
    conn.commit()
    affected = cur.rowcount
    cur.close()
    conn.close()
    if affected == 0:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"status": "reset", "id": reg_id, "attempts_used": 0})


@app.route("/registrations/<sr_code>", methods=["GET"])
def get_registration(sr_code):
    conn, db_type = get_db_connection()
    if db_type == "mysql":
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM registrations WHERE sr_code = %s", (sr_code,))
        row = cur.fetchone()
        if row and isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat(timespec="seconds")
    else:
        cur = conn.cursor()
        cur.execute("SELECT id, first_name, last_name, mi, sr_code, department, course, registration_method, created_at FROM registrations WHERE sr_code = ?", (sr_code,))
        r = cur.fetchone()
        row = {
            "id": r[0], "first_name": r[1], "last_name": r[2], "mi": r[3],
            "sr_code": r[4], "department": r[5], "course": r[6],
            "registration_method": r[7], "created_at": r[8]
        } if r else None

    cur.close()
    conn.close()
    if not row:
        return jsonify({"error": "Registration not found"}), 404
    return jsonify(row)


@app.route("/registrations/<int:reg_id>", methods=["DELETE"])
def delete_registration(reg_id):
    conn, db_type = get_db_connection()
    cur = conn.cursor()
    if db_type == "mysql":
        cur.execute("DELETE FROM registrations WHERE id = %s", (reg_id,))
    else:
        cur.execute("DELETE FROM registrations WHERE id = ?", (reg_id,))
    conn.commit()
    affected = cur.rowcount
    cur.close()
    conn.close()
    if affected == 0:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"status": "deleted", "id": reg_id})


if __name__ == "__main__":
    init_db()
    print("[START] Starting BSU Registration Backend server on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)