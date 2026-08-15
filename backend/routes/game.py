"""
Game routes:
- Start game attempt (max 3 attempts per player)
- Validate constellation step connections
- Submit attempt telemetry and calculate final score
"""

from flask import Blueprint, request, jsonify

from models.player import (
    get_player_by_id,
    MAX_ATTEMPTS,
    increment_attempt_and_update_best_score,
)
from models.constellation import validate_connection
from models.game_session import (
    create_session,
    get_session,
    update_session,
    finalize_attempt,
)
from services.scoring_service import compute_score

game_bp = Blueprint("game", __name__, url_prefix="/api/game")


@game_bp.route("/start", methods=["POST"])
def start_game():
    """
    Start a new game attempt for a player.
    Request body: { "player_id": int, "constellation_id": int }
    """
    data = request.get_json(silent=True) or {}
    player_id = data.get("player_id") or data.get("user_id")

    if not player_id:
        return jsonify({"error": "player_id is required"}), 400

    player = get_player_by_id(player_id)
    if not player:
        return jsonify({"error": "Player not found"}), 404

    attempts_used = player["total_attempts_used"]

    if attempts_used >= MAX_ATTEMPTS:
        return jsonify({
            "error": "Max attempts reached (3/3). No more attempts allowed.",
            "attempts_used": attempts_used,
            "attempts_remaining": 0,
            "can_play": False,
        }), 403

    attempt_number = attempts_used + 1
    constellation_id = data.get("constellation_id", 1)

    session_id = create_session(
        player_id=player_id,
        constellation_id=constellation_id,
        attempt_number=attempt_number,
    )

    return jsonify({
        "session_id": session_id,
        "player_id": player_id,
        "attempt_number": attempt_number,
        "attempts_used": attempts_used,
        "attempts_remaining": MAX_ATTEMPTS - attempt_number,
        "can_play": True,
    }), 201


@game_bp.route("/validate-step", methods=["POST"])
def validate_step():
    """
    Validate a drawn step from star A to star B against expected linked list.
    Request body: { "constellation_id": int, "from_node_id": int, "to_node_id": int }
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
def submit_game():
    """
    Submit completed attempt telemetry.
    Request body: {
        "session_id": int,
        "time_elapsed_ms": int,
        "wrong_connections": int,
        "total_clicks": int,
        "wand_travel_dist": float,
        "completed_status": int,
        "time_limit_sec": int
    }
    """
    data = request.get_json(silent=True) or {}

    session_id = data.get("session_id")
    if not session_id:
        player_id = data.get("player_id") or data.get("user_id")
        if not player_id:
            return jsonify({"error": "session_id is required"}), 400

    time_elapsed_ms = data.get("time_elapsed_ms") or data.get("total_time") or 0
    wrong_connections = data.get("wrong_connections") or data.get("mistakes") or 0
    total_clicks = data.get("total_clicks") or 0
    wand_travel_dist = data.get("wand_travel_dist") or data.get("distance") or 0.0
    completed_status = data.get("completed_status", 1)
    time_limit_sec = data.get("time_limit_sec", 30)

    # Disqualified (2) or Force Exited (3) -> 0 points
    if completed_status in (2, 3):
        score = 0.0
    else:
        score = compute_score(
            wrong_connections=wrong_connections,
            total_clicks=total_clicks,
            time_elapsed_ms=time_elapsed_ms,
            wand_travel_dist=wand_travel_dist,
            time_limit_sec=time_limit_sec,
        )

    if session_id:
        update_session(
            session_id,
            score=score,
            time_elapsed_ms=time_elapsed_ms,
            wrong_connections=wrong_connections,
            total_clicks=total_clicks,
            wand_travel_dist=wand_travel_dist,
            recalibration_count=0,
        )
        result = finalize_attempt(
            session_id,
            score,
            completed_status=completed_status,
        )
        result["session_id"] = session_id
        result["score"] = score
        result["attempt_score"] = score
        result["completed_status"] = completed_status
        return jsonify(result), 200

    # Direct player submission fallback
    attempt_result = increment_attempt_and_update_best_score(player_id, score)
    return jsonify({
        "player_id": player_id,
        "score": score,
        "attempt_score": score,
        "best_score": attempt_result["best_score"],
        "attempts_used": attempt_result["attempts_used"],
        "attempts_remaining": max(0, MAX_ATTEMPTS - attempt_result["attempts_used"]),
        "completed_status": completed_status,
    }), 200


@game_bp.route("/session/<int:session_id>", methods=["GET"])
def get_game_session_result(session_id: int):
    """
    Retrieve a completed game session by ID.
    """
    session = get_session(session_id)
    if not session:
        return jsonify({"error": "Game session not found"}), 404

    return jsonify(session), 200
