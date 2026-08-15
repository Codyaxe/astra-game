"""
Game routes:
- Start a game attempt with a maximum of 3 attempts
- Validate constellation connections
- Submit and record the completed game session
"""

from flask import Blueprint, request, jsonify

from models.player import (
    get_player_by_id,
    MAX_ATTEMPTS,
    increment_attempt_and_update_best_score,
)
from models.constellation import validate_connection
from models.game_session import (
    create_game_session,
    get_game_session,
)
from services.scoring_service import compute_score


game_bp = Blueprint("game", __name__, url_prefix="/api/game")


@game_bp.route("/start", methods=["POST"])
def start_game():
    """
    Start a new game attempt.

    The game session is created when the player submits
    the completed game, not when the game starts.
    """

    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")

    if not user_id:
        return jsonify({
            "error": "user_id is required"
        }), 400

    player = get_player_by_id(user_id)

    if not player:
        return jsonify({
            "error": "Player not found"
        }), 404

    attempts_used = player["total_attempts_used"]

    if attempts_used >= MAX_ATTEMPTS:
        return jsonify({
            "error": "Max attempts reached (3/3). No more attempts allowed.",
            "attempts_used": attempts_used,
            "can_play": False,
        }), 403

    attempt_number = attempts_used + 1

    return jsonify({
        "user_id": user_id,
        "attempt_number": attempt_number,
        "attempts_remaining": MAX_ATTEMPTS - attempt_number,
        "can_play": True,
    }), 200


@game_bp.route("/validate-step", methods=["POST"])
def validate_step():
    """
    Validate a connection between two stars in a constellation.
    """

    data = request.get_json(silent=True) or {}

    constellation_id = data.get("constellation_id")
    from_node_id = data.get("from_node_id")
    to_node_id = data.get("to_node_id")

    if (
        constellation_id is None
        or from_node_id is None
        or to_node_id is None
    ):
        return jsonify({
            "error": "Missing parameters"
        }), 400

    is_valid = validate_connection(
        constellation_id,
        from_node_id,
        to_node_id,
    )

    return jsonify({
        "valid": is_valid,
        "from_node_id": from_node_id,
        "to_node_id": to_node_id,
    }), 200


@game_bp.route("/submit", methods=["POST"])
def submit_game():
    """
    Submit a completed game attempt.

    total_clicks is used to calculate the final score,
    but is not stored in the game_session table.
    """

    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    total_time = data.get("total_time")
    mistakes = data.get("mistakes", 0)
    distance = data.get("distance", 0.0)

    # Used by scoring_service but not stored in game_session.
    total_clicks = data.get("total_clicks", 0)

    completed_status = data.get("completed_status", 1)

    # Temporary value until the game's overall time limit
    # is finalized from the constellation/game configuration.
    time_limit = data.get("time_limit_sec", 30)

    if user_id is None or total_time is None:
        return jsonify({
            "error": "user_id and total_time are required"
        }), 400

    player = get_player_by_id(user_id)

    if not player:
        return jsonify({
            "error": "Player not found"
        }), 404

    attempts_used = player["total_attempts_used"]

    if attempts_used >= MAX_ATTEMPTS:
        return jsonify({
            "error": "Max attempts reached (3/3). No more attempts allowed.",
            "attempts_used": attempts_used,
            "can_play": False,
        }), 403

    attempt_number = attempts_used + 1

    # Calculate the final score using all gameplay telemetry.
    if completed_status in (2, 3):
        score = 0.0
    else:
        score = compute_score(
            mistakes,
            total_clicks,
            total_time,
            distance,
        time_limit,
    )

    # Store only the fields defined in game_session.
    game_session_id = create_game_session(
        user_id=user_id,
        attempt_number=attempt_number,
        score=score,
        total_time=total_time,
        mistakes=mistakes,
        distance=distance,
    )

    # Update the player's attempt count and best score.
    attempt_result = increment_attempt_and_update_best_score(
        user_id,
        score,
    )

    return jsonify({
        "game_session_id": game_session_id,
        "user_id": user_id,
        "attempt_number": attempt_number,
        "score": score,
        "total_time": total_time,
        "mistakes": mistakes,
        "distance": distance,
        "attempts_used": attempt_result["attempts_used"],
        "best_score": attempt_result["best_score"],
    }), 201


@game_bp.route("/session/<int:game_session_id>", methods=["GET"])
def get_game_session_result(game_session_id: int):
    """
    Retrieve a completed game session by ID.
    """

    session = get_game_session(game_session_id)

    if not session:
        return jsonify({
            "error": "Game session not found"
        }), 404

    return jsonify(session), 200