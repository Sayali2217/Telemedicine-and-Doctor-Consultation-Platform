from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import decode_token
from config import JWT_SECRET
import jwt

def token_required(f):
    """Middleware to verify JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization')
        
        if not auth or not auth.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        
        token = auth.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        return f(*args, **kwargs)
    
    return decorated
