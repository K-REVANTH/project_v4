from flask import Flask
from flask_cors import CORS
from app.routes import records_bp
from datetime import datetime


def create_app():
    app = Flask(__name__)
    CORS(app)

    app.register_blueprint(records_bp, url_prefix='/api/records')

    @app.route('/health')
    def health():
        return {
            'status': 'ok',
            'service': 'medical-records',
            'timestamp': datetime.utcnow().isoformat()
        }

    return app
