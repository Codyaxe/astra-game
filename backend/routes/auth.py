"""
Auth & Registration routes:
- OCR-based student ID registration
- Mobile-QR fallback registration on local network
- QR Ticket generation & auto-download
- QR Ticket scanning on Kiosk for retries
"""
 
import io
import os
import uuid
import qrcode
from flask import Blueprint, request, jsonify, send_file
from mysql.connector.errors import IntegrityError
from models.player import (
    create_player,
    get_player_by_id,
    get_player_by_sr_code,
    get_player_by_ticket,
    get_all_players,
    reset_player_attempts,
    delete_player,
    find_player_by_ticket_or_sr,
    MAX_ATTEMPTS,
)
from database.db import execute
from services.ocr_service import extract_student_id_info
 
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
 
ID_UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "ids")
os.makedirs(ID_UPLOAD_DIR, exist_ok=True)
 
 
def _create_or_fetch_existing(first_name, last_name, sr_code, course, contact, source, mi="", department="", year_level="", section=""):
    """
    Shared insert logic for /register and /mobile-register.
    Handles the race where two requests for the same sr_code land at
    once: the first INSERT wins, the second hits the UNIQUE constraint
    on sr_code and we just fall back to reading the row that won.

    Returns (player_dict, is_new).
    """
    try:
        player_id, _ticket_code = create_player(
            first_name=first_name,
            last_name=last_name,
            sr_code=sr_code,
            course=course,
            contact_number=contact,
            registration_source=source,
            mi=mi,
            department=department,
            year_level=year_level,
            section=section
        )
        return get_player_by_id(player_id), True
    except IntegrityError:
        existing = get_player_by_sr_code(sr_code)
        if existing:
            # Dynamically update details if any are empty
            update_fields = {}
            for field, val in [("mi", mi), ("department", department), ("year_level", year_level), ("section", section)]:
                if val and not existing.get(field):
                    update_fields[field] = val
            if update_fields:
                set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
                params = list(update_fields.values()) + [existing["id"]]
                execute(f"UPDATE players SET {set_clause} WHERE id = %s", tuple(params), commit=True)
                existing = get_player_by_id(existing["id"])
            return existing, False
        # Extremely unlikely: constraint fired on qr_ticket_code collision,
        # not sr_code. Re-raise so it surfaces as a 500 instead of a
        # silent None being returned to the caller.
        raise
 
 
@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Standard OCR-assisted or direct kiosk registration.
    """
    data = request.get_json(silent=True) or {}
    first_name = data.get("first_name", "").strip() or data.get("firstName", "").strip()
    last_name = data.get("last_name", "").strip() or data.get("lastName", "").strip()
    sr_code = data.get("sr_code", "").strip() or data.get("srCode", "").strip()
    course = data.get("course", "").strip()
    contact = data.get("contact_number", "").strip() or data.get("contactNumber", "").strip() or None
    mi = data.get("mi", "").strip()
    department = data.get("department", "").strip() or data.get("dept", "").strip()
    year_level = data.get("year_level", "").strip() or data.get("yearLevel", "").strip()
    section = data.get("section", "").strip()
 
    if not first_name or not last_name or not sr_code or not course:
        return jsonify({"error": "first_name, last_name, sr_code, and course are required"}), 400
 
    existing = get_player_by_sr_code(sr_code)
    if existing:
        # Dynamically update details if any are empty
        update_fields = {}
        for field, val in [("mi", mi), ("department", department), ("year_level", year_level), ("section", section)]:
            if val and not existing.get(field):
                update_fields[field] = val
        if update_fields:
            set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
            params = list(update_fields.values()) + [existing["id"]]
            execute(f"UPDATE players SET {set_clause} WHERE id = %s", tuple(params), commit=True)
            existing = get_player_by_id(existing["id"])

        return jsonify({
            "player": existing,
            "qr_ticket_code": existing["qr_ticket_code"],
            "attempts_remaining": max(0, MAX_ATTEMPTS - existing["total_attempts_used"]),
            "message": "Player already registered.",
        }), 200
 
    try:
        player, is_new = _create_or_fetch_existing(
            first_name, last_name, sr_code, course, contact, "ocr",
            mi=mi, department=department, year_level=year_level, section=section
        )
    except IntegrityError:
        return jsonify({"error": "Registration conflict, please retry"}), 409
 
    status = 201 if is_new else 200
    body = {
        "player": player,
        "qr_ticket_code": player["qr_ticket_code"],
        "attempts_remaining": max(0, MAX_ATTEMPTS - player["total_attempts_used"]),
    }
    if is_new:
        body["message"] = "Registration successful."
    else:
        body["message"] = "Player already registered."
    return jsonify(body), status


@auth_bp.route("/extract-id", methods=["POST"])
def extract_id():
    """
    Accept an uploaded student ID card image and extract student information.
    """
    file = request.files.get("image") or request.files.get("photo")
    if not file:
        return jsonify({"success": False, "error": "No image file provided"}), 400

    try:
        extracted = extract_student_id_info(file.stream)
        return jsonify({
            "success": True,
            "data": extracted,
            "message": "ID card scanned successfully",
        }), 200
    except Exception as exc:
        return jsonify({
            "success": False,
            "error": f"Failed to extract ID info: {str(exc)}",
            "data": {
                "firstName": "", "lastName": "", "mi": "",
                "srCode": "", "course": "", "dept": "CICS",
                "yearLevel": "1st Year", "section": "1101"
            }
        }), 200
 
 
@auth_bp.route("/mobile-register", methods=["POST"])
def mobile_register():
    """
    Fallback registration path: Player connects to local router,
    scans on-site kiosk QR, fills form on phone, submits, and gets
    a downloadable QR ticket.
    """
    data = request.get_json(silent=True) or {}
    first_name = data.get("first_name", "").strip() or data.get("firstName", "").strip()
    last_name = data.get("last_name", "").strip() or data.get("lastName", "").strip()
    sr_code = data.get("sr_code", "").strip() or data.get("srCode", "").strip()
    course = data.get("course", "").strip()
    contact = data.get("contact_number", "").strip() or data.get("contactNumber", "").strip() or None
    mi = data.get("mi", "").strip()
    department = data.get("department", "").strip() or data.get("dept", "").strip()
    year_level = data.get("year_level", "").strip() or data.get("yearLevel", "").strip()
    section = data.get("section", "").strip()
 
    if not first_name or not last_name or not sr_code or not course:
        return jsonify({"error": "All required fields must be filled"}), 400
 
    existing = get_player_by_sr_code(sr_code)
    if existing:
        # Dynamically update details if any are empty
        update_fields = {}
        for field, val in [("mi", mi), ("department", department), ("year_level", year_level), ("section", section)]:
            if val and not existing.get(field):
                update_fields[field] = val
        if update_fields:
            set_clause = ", ".join([f"{k} = %s" for k in update_fields.keys()])
            params = list(update_fields.values()) + [existing["id"]]
            execute(f"UPDATE players SET {set_clause} WHERE id = %s", tuple(params), commit=True)
            existing = get_player_by_id(existing["id"])

        return jsonify({
            "player": existing,
            "qr_ticket_code": existing["qr_ticket_code"],
            "download_ticket_url": f"/api/auth/ticket-qr/{existing['id']}",
            "attempts_remaining": max(0, MAX_ATTEMPTS - existing["total_attempts_used"]),
            "message": "Existing player record loaded.",
        }), 200
 
    try:
        player, is_new = _create_or_fetch_existing(
            first_name, last_name, sr_code, course, contact, "mobile_qr",
            mi=mi, department=department, year_level=year_level, section=section
        )
    except IntegrityError:
        return jsonify({"error": "Registration conflict, please retry"}), 409
 
    status = 201 if is_new else 200
    body = {
        "player": player,
        "qr_ticket_code": player["qr_ticket_code"],
        "download_ticket_url": f"/api/auth/ticket-qr/{player['id']}",
        "attempts_remaining": max(0, MAX_ATTEMPTS - player["total_attempts_used"]),
    }
    if not is_new:
        body["message"] = "Existing player record loaded."
    return jsonify(body), status


@auth_bp.route("/ticket-qr/<int:player_id>", methods=["GET"])
def ticket_qr(player_id):
    """
    Generate an authentic QR code image for a player ticket.
    """
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    qr_text = player["qr_ticket_code"]
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


@auth_bp.route("/qr-generate", methods=["GET"])
def qr_generate():
    """
    Generate a dynamic QR code PNG for any arbitrary payload string.
    """
    data = request.args.get("data", "").strip()
    if not data:
        return jsonify({"error": "data query param is required"}), 400

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return send_file(buf, mimetype="image/png")


@auth_bp.route("/use-attempt", methods=["POST"])
def use_attempt():
    """
    Kiosk / Game station ticket puncher.
    Consumes 1 attempt if available and returns player authorization.
    """
    data = request.get_json(silent=True) or {}
    ticket = data.get("ticket", "").strip() or data.get("qr_ticket_code", "").strip()
    if not ticket:
        return jsonify({"status": "denied", "error": "No ticket provided"}), 400

    player = find_player_by_ticket_or_sr(ticket)
    if not player:
        return jsonify({"status": "denied", "error": "Ticket / Player not found"}), 404

    attempts_used = player["total_attempts_used"]
    if attempts_used >= MAX_ATTEMPTS:
        return jsonify({
            "status": "denied",
            "error": f"Maximum attempts reached ({MAX_ATTEMPTS}/{MAX_ATTEMPTS})",
            "player": player,
            "attempts_used": attempts_used,
            "attempts_remaining": 0,
        }), 200

    # Allowed: return player info
    remaining = MAX_ATTEMPTS - attempts_used
    return jsonify({
        "status": "allowed",
        "message": f"Ticket verified. Attempt {attempts_used + 1} of {MAX_ATTEMPTS}.",
        "player": player,
        "attempts_used": attempts_used,
        "attempts_remaining": remaining,
    }), 200


@auth_bp.route("/ticket/<target>", methods=["GET"])
def get_ticket(target):
    """
    Retrieve player ticket by token or SR code.
    """
    player = find_player_by_ticket_or_sr(target)
    if not player:
        return jsonify({"error": "Ticket not found"}), 404

    return jsonify({
        "player": player,
        "qr_ticket_code": player["qr_ticket_code"],
        "attempts_remaining": max(0, MAX_ATTEMPTS - player["total_attempts_used"]),
        "attempts_used": player["total_attempts_used"],
    }), 200


@auth_bp.route("/registrations", methods=["GET"])
def list_registrations():
    """
    Admin dashboard: list all registrations.
    """
    players = get_all_players()
    return jsonify({"registrations": players, "count": len(players)}), 200


@auth_bp.route("/registrations/<int:player_id>/reset", methods=["POST"])
def reset_registration(player_id):
    """
    Admin dashboard: reset attempts for a player.
    """
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    reset_player_attempts(player_id)
    updated = get_player_by_id(player_id)
    return jsonify({
        "success": True,
        "message": "Player attempts reset to 0",
        "player": updated
    }), 200


@auth_bp.route("/registrations/<int:player_id>", methods=["DELETE"])
def delete_registration(player_id):
    """
    Admin dashboard: delete a player record.
    """
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    delete_player(player_id)
    return jsonify({"success": True, "message": "Player registration deleted"}), 200


@auth_bp.route("/player/<int:player_id>", methods=["GET"])
def get_player(player_id):
    """
    Get a registered player by their database ID.
    """
    player = get_player_by_id(player_id)

    if not player:
        return jsonify({"error": "Player not found"}), 404

    return jsonify({
        "player": player,
        "attempts_remaining": max(
            0,
            MAX_ATTEMPTS - player["total_attempts_used"]
        ),
    }), 200


@auth_bp.route("/scan-ticket", methods=["POST"])
def scan_ticket():
    """
    Scan/validate a player's QR ticket.
    Used by the kiosk to identify an existing player.
    """
    data = request.get_json(silent=True) or {}
    qr_ticket_code = data.get("qr_ticket_code", "").strip()

    if not qr_ticket_code:
        return jsonify({"error": "qr_ticket_code is required"}), 400

    player = get_player_by_ticket(qr_ticket_code)

    if not player:
        return jsonify({"error": "Invalid QR ticket"}), 404

    return jsonify({
        "player": player,
        "attempts_remaining": max(
            0,
            MAX_ATTEMPTS - player["total_attempts_used"]
        ),
    }), 200