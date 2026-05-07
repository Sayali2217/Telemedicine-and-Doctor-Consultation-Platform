"""
MediConnect — Flask API Server
Port: 5000
"""
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import sys
import os

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Import routes
from routes import auth, patients, doctors, consultations, prescriptions, messages, orders, inventory, analytics, schedules

# Register blueprints
app.register_blueprint(auth.bp)
app.register_blueprint(patients.bp)
app.register_blueprint(doctors.bp)
app.register_blueprint(consultations.bp)
app.register_blueprint(prescriptions.bp)
app.register_blueprint(messages.bp)
app.register_blueprint(orders.bp)
app.register_blueprint(inventory.bp)
app.register_blueprint(analytics.bp)
app.register_blueprint(schedules.bp)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'MediConnect API',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# 404 handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Route not found'}), 404

# Error handler for all exceptions
@app.errorhandler(Exception)
def handle_error(error):
    print(f"Error: {error}", file=sys.stderr)
    return jsonify({
        'error': 'Internal server error',
        'message': str(error)
    }), 500

if __name__ == '__main__':
    from config import API_PORT
    print(f"\n🏥 MediConnect API running on http://localhost:{API_PORT}")
    print(f"   Health: http://localhost:{API_PORT}/health\n")
    app.run(host='0.0.0.0', port=API_PORT, debug=True)
