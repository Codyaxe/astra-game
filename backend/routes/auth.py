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
    MAX_ATTEMPTS,
)
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
        "attempts_remaining": max(0, MAX_ATTEMPTS - player["total_attempts_used"]),
    }
    if is_new:
        body["qr_ticket_code"] = player["qr_ticket_code"]
    else:
        body["message"] = "Player already registered."
    return jsonify(body), status
 
 
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