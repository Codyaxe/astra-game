"""
Constellation routes — serve constellation definitions to the frontend.
"""

from flask import Blueprint, jsonify
from models.constellation import get_all, get_by_id

constellations_bp = Blueprint("constellations", __name__, url_prefix="/api/constellations")


@constellations_bp.route("/", methods=["GET"])
def list_constellations():
    """Return all constellation definitions (nodes, edges, fake nodes, time limits)."""
    return jsonify({"constellations": get_all()}), 200


@constellations_bp.route("/<int:constellation_id>", methods=["GET"])
def get_constellation(constellation_id: int):
    """Return a single constellation by ID."""
    c = get_by_id(constellation_id)
    if not c:
        return jsonify({"error": "Constellation not found"}), 404
    return jsonify(c), 200
