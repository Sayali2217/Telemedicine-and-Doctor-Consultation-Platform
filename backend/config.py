import os
import pymysql
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'root123'),
    'database': os.getenv('DB_NAME', 'mediconnect'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
}

JWT_SECRET = os.getenv('JWT_SECRET', 'mediconnect_secret_2026')
API_PORT = int(os.getenv('PORT', 5000))

def get_db_connection():
    """Get a new database connection"""
    return pymysql.connect(**DB_CONFIG)
