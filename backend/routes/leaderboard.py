"""
Leaderboard routes — rankings and QR code generation.
"""

import io
import qrcode
from flask import Blueprint, request, jsonify, send_file
from models.game_session import get_leaderboard

leaderboard_bp = Blueprint("leaderboard", __name__, url_prefix="/api/leaderboard")


@leaderboard_bp.route("/", methods=["GET"])
def get_rankings():
    """
    Return the top N players by total_score descending.

    Query params:
        limit  (int, default 10)
    """
    limit = request.args.get("limit", 10, type=int)
    rankings = get_leaderboard(limit)
    return jsonify({"leaderboard": rankings}), 200


@leaderboard_bp.route("/qr/<int:player_id>", methods=["GET"])
def generate_qr(player_id: int):
    """
    Generate a QR code PNG encoding the player's result URL.
    """
    # TODO: replace with your actual domain / deep-link
    data = f"https://yourdomain.com/results/{player_id}"

    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return send_file(buf, mimetype="image/png", download_name="qr.png")
