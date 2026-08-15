"""
Constellation-Tracing Game — Flask application entry point.
"""

import os
from flask import Flask
from flask_cors import CORS

from config import config_by_name
from database.db import init_db
from database.seed import seed
from routes.auth import auth_bp
from routes.game import game_bp
from routes.constellations import constellations_bp
from routes.leaderboard import leaderboard_bp


def create_app(config_name: str | None = None) -> Flask:
    """Application factory."""
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # CORS — allow Vite dev server and local network devices to call the API
    CORS(app, resources={r"/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp) # /api/auth
    app.register_blueprint(auth_bp, url_prefix="", name="auth_root") # root aliases for legacy forms
    app.register_blueprint(game_bp)
    app.register_blueprint(constellations_bp)
    app.register_blueprint(leaderboard_bp)

    # Bootstrap database + seed constellations
    with app.app_context():
        try:
            init_db()
            seed()
        except Exception as exc:
            app.logger.warning("DB init/seed skipped: %s", exc)

    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app


# ----- Run directly with `python app.py` -----
if __name__ == "__main__":
    application = create_app()
    application.run(
        host=application.config["HOST"],
        port=application.config["PORT"],
    )
