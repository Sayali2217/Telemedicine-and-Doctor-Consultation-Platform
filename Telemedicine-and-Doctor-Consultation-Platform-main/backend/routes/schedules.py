from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required
from datetime import datetime, timedelta

bp = Blueprint('schedules', __name__, url_prefix='/api/schedules')

@bp.route('/doctor/<doctor_id>/month', methods=['GET'])
@token_required
def get_doctor_schedules_month(doctor_id):
    try:
        month = request.args.get('month')
        year = request.args.get('year')
        
        if not month or not year:
            return jsonify({'error': 'Month and year required'}), 400
        
        month = int(month)
        year = int(year)
        
        # Calculate date range
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
        else:
            end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT * FROM doctor_schedules 
               WHERE doctor_id = %s AND slot_date BETWEEN %s AND %s
               ORDER BY slot_date, slot_time''',
            (doctor_id, start_date, end_date)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'data': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/doctor/<doctor_id>/available', methods=['GET'])
@token_required
def get_available_slots(doctor_id):
    try:
        date = request.args.get('date')
        
        if not date:
            return jsonify({'error': 'Date required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT * FROM doctor_schedules 
               WHERE doctor_id = %s AND slot_date = %s AND is_available = 1
               ORDER BY slot_time''',
            (doctor_id, date)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'data': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/doctor/<doctor_id>/create-slots', methods=['POST'])
@token_required
def create_slots(doctor_id):
    try:
        data = request.get_json()
        date = data.get('date')
        start_time = data.get('startTime')
        end_time = data.get('endTime')
        interval_mins = int(data.get('intervalMins', 30))
        
        if not date or not start_time or not end_time:
            return jsonify({'error': 'Date, startTime, and endTime required'}), 400
        
        # Parse hours
        start_hour = int(start_time.split(':')[0])
        end_hour = int(end_time.split(':')[0])
        
        # Generate slots
        slots = []
        for hour in range(start_hour, end_hour):
            for minute in range(0, 60, interval_mins):
                slot_time = f'{str(hour).zfill(2)}:{str(minute).zfill(2)}:00'
                slots.append((doctor_id, date, slot_time, 1, None))
        
        if not slots:
            return jsonify({'message': 'No slots generated', 'count': 0}), 201
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert ignoring duplicates
        for slot in slots:
            try:
                cursor.execute(
                    '''INSERT INTO doctor_schedules (doctor_id, slot_date, slot_time, is_available, booked_by) 
                       VALUES (%s, %s, %s, %s, %s)''',
                    slot
                )
            except Exception:
                # Ignore duplicate errors
                pass
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Slots created', 'count': len(slots)}), 201
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<schedule_id>/book', methods=['PATCH'])
@token_required
def book_schedule(schedule_id):
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE doctor_schedules SET is_available = 0, booked_by = %s WHERE id = %s',
            (patient_id, schedule_id)
        )
        conn.commit()
        
        cursor.execute('SELECT * FROM doctor_schedules WHERE id = %s', (schedule_id,))
        schedule = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        return jsonify(schedule), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<schedule_id>/release', methods=['PATCH'])
@token_required
def release_schedule(schedule_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            'UPDATE doctor_schedules SET is_available = 1, booked_by = NULL WHERE id = %s',
            (schedule_id,)
        )
        conn.commit()
        
        cursor.execute('SELECT * FROM doctor_schedules WHERE id = %s', (schedule_id,))
        schedule = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not schedule:
            return jsonify({'error': 'Schedule not found'}), 404
        
        return jsonify(schedule), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
