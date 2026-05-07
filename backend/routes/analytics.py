from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required
import random

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@bp.route('/overview', methods=['GET'])
@token_required
def get_overview():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get counts
        cursor.execute('SELECT COUNT(*) as count FROM patients')
        patients = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM doctors')
        doctors = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM consultations')
        consultations = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM orders')
        orders = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM prescriptions')
        prescriptions = cursor.fetchone()['count']
        
        cursor.execute('SELECT SUM(total_amount) as total FROM orders WHERE status != "cancelled"')
        total_revenue_row = cursor.fetchone()
        total_revenue = float(total_revenue_row['total'] or 0)
        
        cursor.execute('SELECT COUNT(*) as count FROM inventory WHERE qty < min_qty')
        low_stock_items = cursor.fetchone()['count']
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'patients': patients,
            'doctors': doctors,
            'consultations': consultations,
            'orders': orders,
            'prescriptions': prescriptions,
            'totalRevenue': total_revenue,
            'lowStockItems': low_stock_items
        }), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/consultations/weekly', methods=['GET'])
@token_required
def get_weekly_consultations():
    return jsonify({
        'labels': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        'data': [42, 58, 50, 74, 66, 30, 18],
        'total': 338,
        'avgPerDay': 48,
    }), 200

@bp.route('/revenue/monthly', methods=['GET'])
@token_required
def get_monthly_revenue():
    return jsonify({
        'labels': ['Jan', 'Feb', 'Mar', 'Apr'],
        'data': [280000, 310000, 352000, 420000],
        'growth': '+19%',
    }), 200

@bp.route('/doctors/performance', methods=['GET'])
@token_required
def get_doctor_performance():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, speciality, rating, total_patients FROM doctors')
        doctors = cursor.fetchall()
        cursor.close()
        conn.close()
        
        result = []
        for d in doctors:
            result.append({
                'id': d['id'],
                'name': d['name'],
                'speciality': d['speciality'],
                'consultations': random.randint(10, 60),
                'avgDuration': f'{random.uniform(10, 20):.1f}',
                'rating': d.get('rating', 4.5),
                'revenue': random.randint(20000, 70000),
            })
        
        return jsonify(result), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/pharmacy/revenue', methods=['GET'])
@token_required
def get_pharmacy_revenue():
    return jsonify({
        'today': 18400,
        'thisWeek': 126000,
        'mtd': 420000,
        'breakdown': {
            'consultationFees': 180000,
            'pharmacy': 210000,
            'labReports': 30000,
        },
    }), 200
