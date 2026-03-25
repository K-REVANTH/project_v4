from flask import Flask
from flask_cors import CORS
from app.routes import pharmacy_bp
from datetime import datetime


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(pharmacy_bp, url_prefix='/api/pharmacy')

    @app.route('/health')
    def health():
        return {
            'status': 'ok',
            'service': 'pharmacy',
            'timestamp': datetime.utcnow().isoformat()
        }

    return app
