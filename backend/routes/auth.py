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


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Standard OCR-assisted or direct kiosk registration.
    """
    data = request.get_json(silent=True) or {}
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    sr_code = data.get("sr_code", "").strip()
    course = data.get("course", "").strip()
    contact = data.get("contact_number", "").strip() or None

    if not first_name or not last_name or not sr_code or not course:
        return jsonify({"error": "first_name, last_name, sr_code, and course are required"}), 400

    existing = get_player_by_sr_code(sr_code)
    if existing:
        return jsonify({
            "player": existing,
            "attempts_remaining": max(0, MAX_ATTEMPTS - existing["total_attempts_used"]),
            "message": "Player already registered.",
        }), 200

    player_id, ticket_code = create_player(
        first_name=first_name,
        last_name=last_name,
        sr_code=sr_code,
        course=course,
        contact_number=contact,
        registration_source="ocr",
    )

    player = get_player_by_id(player_id)
    return jsonify({
        "player": player,
        "qr_ticket_code": ticket_code,
        "attempts_remaining": MAX_ATTEMPTS,
    }), 201


@auth_bp.route("/mobile-register", methods=["POST"])
def mobile_register():
    """
    Fallback registration path: Player connects to local router,
    scans on-site kiosk QR, fills form on phone, submits, and gets
    a downloadable QR ticket.
    """
    data = request.get_json(silent=True) or {}
    first_name = data.get("first_name", "").strip()
    last_name = data.get("last_name", "").strip()
    sr_code = data.get("sr_code", "").strip()
    course = data.get("course", "").strip()
    contact = data.get("contact_number", "").strip() or None

    if not first_name or not last_name or not sr_code or not course:
        return jsonify({"error": "All required fields must be filled"}), 400

    existing = get_player_by_sr_code(sr_code)
    if existing:
        return jsonify({
            "player": existing,
            "qr_ticket_code": existing["qr_ticket_code"],
            "download_ticket_url": f"/api/auth/ticket-qr/{existing['id']}",
            "attempts_remaining": max(0, MAX_ATTEMPTS - existing["total_attempts_used"]),
            "message": "Existing player record loaded.",
        }), 200

    player_id, ticket_code = create_player(
        first_name=first_name,
        last_name=last_name,
        sr_code=sr_code,
        course=course,
        contact_number=contact,
        registration_source="mobile_qr",
    )

    player = get_player_by_id(player_id)
    return jsonify({
        "player": player,
        "qr_ticket_code": ticket_code,
        "download_ticket_url": f"/api/auth/ticket-qr/{player_id}",
        "attempts_remaining": MAX_ATTEMPTS,
    }), 201


@auth_bp.route("/ticket-qr/<int:player_id>", methods=["GET"])
def download_ticket_qr(player_id: int):
    """
    Generates and returns the downloadable QR ticket PNG image for mobile auto-download.
    """
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    ticket_code = player["qr_ticket_code"]
    img = qrcode.make(ticket_code)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(
        buf,
        mimetype="image/png",
        as_attachment=True,
        download_name=f"astra_ticket_{player['sr_code']}.png",
    )


@auth_bp.route("/scan-ticket", methods=["POST"])
def scan_ticket():
    """
    Kiosk endpoint: verifies a scanned QR ticket code and returns player state
    with remaining attempts.
    """
    data = request.get_json(silent=True) or {}
    ticket_code = data.get("qr_ticket_code", "").strip()
    if not ticket_code:
        return jsonify({"error": "qr_ticket_code is required"}), 400

    player = get_player_by_ticket(ticket_code)
    if not player:
        return jsonify({"error": "Invalid or unknown QR ticket"}), 404

    attempts_used = player["total_attempts_used"]
    attempts_remaining = max(0, MAX_ATTEMPTS - attempts_used)

    return jsonify({
        "player": player,
        "attempts_used": attempts_used,
        "attempts_remaining": attempts_remaining,
        "can_play": attempts_remaining > 0,
    }), 200


@auth_bp.route("/ocr", methods=["POST"])
def ocr_upload():
    """
    Accepts webcam capture frame for OCR extraction of student ID info.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    filename = f"{uuid.uuid4().hex}.png"
    filepath = os.path.join(ID_UPLOAD_DIR, filename)
    file.save(filepath)
    file.seek(0)

    result = extract_student_id_info(file)
    result["id_picture_path"] = filepath
    return jsonify(result), 200


@auth_bp.route("/player/<int:player_id>", methods=["GET"])
def get_player(player_id: int):
    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404
    return jsonify(player), 200
