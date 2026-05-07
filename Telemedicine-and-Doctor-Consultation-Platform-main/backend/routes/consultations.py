from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required
from datetime import datetime

bp = Blueprint('consultations', __name__, url_prefix='/api/consultations')

def format_consultation(r):
    """Format consultation row"""
    date = r.get('scheduled_date')
    if isinstance(date, str):
        date_str = date
    else:
        date_str = date.isoformat()[:10] if date else None
    
    return {
        **r,
        'patientId': r.get('patient_id'),
        'doctorId': r.get('doctor_id'),
        'date': date_str,
        'time': r.get('scheduled_time')
    }

@bp.route('/', methods=['GET'])
@token_required
def get_consultations():
    try:
        status = request.args.get('status')
        doctor_id = request.args.get('doctorId')
        patient_id = request.args.get('patientId')
        date = request.args.get('date')
        
        query = 'SELECT * FROM consultations WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = %s'
            params.append(status)
        if doctor_id:
            query += ' AND doctor_id = %s'
            params.append(doctor_id)
        if patient_id:
            query += ' AND patient_id = %s'
            params.append(patient_id)
        if date:
            query += ' AND scheduled_date = %s'
            params.append(date)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        formatted = [format_consultation(r) for r in rows]
        return jsonify({'count': len(formatted), 'data': formatted}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['GET'])
@token_required
def get_consultation(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM consultations WHERE id = %s', (id,))
        consultation = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not consultation:
            return jsonify({'error': 'Consultation not found'}), 404
        
        return jsonify(format_consultation(consultation)), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_consultation():
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        doctor_id = data.get('doctorId')
        cons_type = data.get('type')
        date_str = data.get('date')
        time_str = data.get('time')
        spec = data.get('spec')
        reason = data.get('reason')
        
        if not patient_id or not doctor_id:
            return jsonify({'error': 'patientId and doctorId required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get count for ID
        cursor.execute('SELECT COUNT(*) as count FROM consultations')
        result = cursor.fetchone()
        count = result['count'] + 1
        new_id = f'C{str(count).zfill(3)}'
        
        # Use defaults if not provided
        default_date = datetime.utcnow().date().isoformat()
        default_time = '10:00:00'
        
        # Insert consultation
        cursor.execute(
            '''INSERT INTO consultations 
               (id, patient_id, doctor_id, type, speciality, scheduled_date, scheduled_time, status, reason) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
            (new_id, patient_id, doctor_id, cons_type or 'video', spec or 'General', 
             date_str or default_date, time_str or default_time, 'scheduled', reason or '')
        )
        conn.commit()
        
        # Get the created consultation
        cursor.execute('SELECT * FROM consultations WHERE id = %s', (new_id,))
        consultation = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify(format_consultation(consultation)), 201
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>/status', methods=['PATCH'])
@token_required
def update_consultation_status(id):
    try:
        data = request.get_json()
        status = data.get('status')
        duration = data.get('duration')
        
        updates = []
        params = []
        
        if status:
            updates.append('status = %s')
            params.append(status)
        if duration is not None:
            updates.append('duration_min = %s')
            params.append(duration)
        
        if not updates:
            return jsonify({'error': 'Nothing to update'}), 400
        
        params.append(id)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE consultations SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        
        cursor.execute('SELECT * FROM consultations WHERE id = %s', (id,))
        consultation = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not consultation:
            return jsonify({'error': 'Not found'}), 404
        
        return jsonify(format_consultation(consultation)), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/stats/today', methods=['GET'])
@token_required
def get_today_stats():
    try:
        today = datetime.utcnow().date().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT status, COUNT(*) as count FROM consultations WHERE scheduled_date = %s GROUP BY status',
            (today,)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        stats = {'total': 0, 'live': 0, 'waiting': 0, 'completed': 0}
        
        for row in rows:
            status_key = row['status'].lower()
            count = row['count']
            stats['total'] += count
            if status_key in stats:
                stats[status_key] = count
        
        return jsonify(stats), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
