"""
Game session routes:
- Start session with attempt limit validation (max 3)
- Real-time step connection validation against expected linked-list struct
- Telemetry & attempt finalization (retaining highest score)
"""

from flask import Blueprint, request, jsonify
from models.player import get_player_by_id, MAX_ATTEMPTS
from models.constellation import get_by_id as get_constellation, validate_connection
from models.game_session import create_session, update_session, get_session, finalize_attempt
from services.scoring_service import compute_score

game_bp = Blueprint("game", __name__, url_prefix="/api/game")


@game_bp.route("/start", methods=["POST"])
def start_session():
    data = request.get_json(silent=True) or {}
    player_id = data.get("player_id")
    constellation_id = data.get("constellation_id")

    if not player_id or not constellation_id:
        return jsonify({"error": "player_id and constellation_id are required"}), 400

    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    attempts_used = player["total_attempts_used"]
    if attempts_used >= MAX_ATTEMPTS:
        return jsonify({
            "error": "Max attempts reached (3/3). No more attempts allowed.",
            "attempts_used": attempts_used,
            "can_play": False,
        }), 403

    current_attempt_num = attempts_used + 1
    session_id = create_session(player_id, constellation_id, attempt_number=current_attempt_num)

    return jsonify({
        "session_id": session_id,
        "attempt_number": current_attempt_num,
        "attempts_remaining": MAX_ATTEMPTS - current_attempt_num,
    }), 201


@game_bp.route("/validate-step", methods=["POST"])
def validate_step():
    """
    Validates a drawn connection from star A to star B against expected linked list.
    """
    data = request.get_json(silent=True) or {}
    constellation_id = data.get("constellation_id")
    from_node_id = data.get("from_node_id")
    to_node_id = data.get("to_node_id")

    if constellation_id is None or from_node_id is None or to_node_id is None:
        return jsonify({"error": "Missing parameters"}), 400

    is_valid = validate_connection(constellation_id, from_node_id, to_node_id)
    return jsonify({
        "valid": is_valid,
        "from_node_id": from_node_id,
        "to_node_id": to_node_id,
    }), 200


@game_bp.route("/submit", methods=["POST"])
def submit_attempt():
    """
    Submit attempt telemetry.
    Status codes:
    1 = Completed
    2 = Disqualified (Timer expired)
    3 = Force Exit (Circle motion gesture)
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    constellation = get_constellation(session["constellation_id"])
    time_limit = constellation["time_limit_sec"] if constellation else 30

    wrong = data.get("wrong_connections", 0)
    clicks = data.get("total_clicks", 0)
    time_ms = data.get("time_elapsed_ms", 0)
    wand_dist = data.get("wand_travel_dist", 0.0)
    recalibrations = data.get("recalibration_count", 0)
    status = data.get("completed_status", 1)

    if status in (2, 3):  # Disqualified or Force Exited
        attempt_score = 0.0
    else:
        attempt_score = compute_score(wrong, clicks, time_ms, wand_dist, time_limit)

    update_session(
        session_id,
        score=attempt_score,
        time_elapsed_ms=time_ms,
        wrong_connections=wrong,
        total_clicks=clicks,
        wand_travel_dist=wand_dist,
        recalibration_count=recalibrations,
        completed_status=status,
    )

    result = finalize_attempt(session_id, attempt_score)
    result["attempt_score"] = attempt_score
    result["completed_status"] = status

    return jsonify(result), 200
