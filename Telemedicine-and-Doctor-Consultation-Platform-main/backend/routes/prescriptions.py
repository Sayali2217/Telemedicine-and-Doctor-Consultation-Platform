from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required
from datetime import datetime

bp = Blueprint('prescriptions', __name__, url_prefix='/api/prescriptions')

@bp.route('/', methods=['GET'])
@token_required
def get_prescriptions():
    try:
        patient_id = request.args.get('patientId')
        doctor_id = request.args.get('doctorId')
        status = request.args.get('status')
        
        query = 'SELECT * FROM prescriptions WHERE 1=1'
        params = []
        
        if patient_id:
            query += ' AND patient_id = %s'
            params.append(patient_id)
        if doctor_id:
            query += ' AND doctor_id = %s'
            params.append(doctor_id)
        if status:
            query += ' AND status = %s'
            params.append(status)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        formatted = [
            {**r, 'patientId': r['patient_id'], 'doctorId': r['doctor_id']}
            for r in rows
        ]
        return jsonify({'count': len(rows), 'data': formatted}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['GET'])
@token_required
def get_prescription(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM prescriptions WHERE id = %s', (id,))
        rx = cursor.fetchone()
        
        if not rx:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Prescription not found'}), 404
        
        cursor.execute(
            'SELECT medicine_name, dosage, duration FROM prescription_items WHERE prescription_id = %s',
            (id,)
        )
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            **rx,
            'patientId': rx['patient_id'],
            'doctorId': rx['doctor_id'],
            'medicines': [item['medicine_name'] for item in items]
        }), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_prescription():
    try:
        data = request.get_json()
        consultation_id = data.get('consultationId')
        patient_id = data.get('patientId')
        doctor_id = data.get('doctorId')
        medicines = data.get('medicines', [])
        diagnosis = data.get('diagnosis')
        notes = data.get('notes')
        
        if not patient_id or not doctor_id or not medicines:
            return jsonify({'error': 'patientId, doctorId and medicines are required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get count for ID
            cursor.execute('SELECT COUNT(*) as count FROM prescriptions')
            result = cursor.fetchone()
            count = result['count'] + 1
            new_id = f'PRX-{2200 + count}'
            
            today = datetime.utcnow().date().isoformat()
            
            # Insert prescription
            cursor.execute(
                '''INSERT INTO prescriptions 
                   (id, consultation_id, patient_id, doctor_id, diagnosis, notes, status, issued_date) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
                (new_id, consultation_id, patient_id, doctor_id, diagnosis, notes, 'active', today)
            )
            
            # Insert medicines
            for med in medicines:
                med_name = med if isinstance(med, str) else med.get('name')
                cursor.execute(
                    'INSERT INTO prescription_items (prescription_id, medicine_name) VALUES (%s, %s)',
                    (new_id, med_name)
                )
            
            conn.commit()
            
            return jsonify({
                'id': new_id,
                'patientId': patient_id,
                'doctorId': doctor_id,
                'medicines': medicines,
                'status': 'active',
                'date': today
            }), 201
        
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()
            conn.close()
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>/verify', methods=['PATCH'])
@token_required
def verify_prescription(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''UPDATE prescriptions SET verified_by = %s, verified_at = CURRENT_TIMESTAMP, status = 'verified' WHERE id = %s''',
            (request.user['id'], id)
        )
        conn.commit()
        
        cursor.execute('SELECT * FROM prescriptions WHERE id = %s', (id,))
        prescription = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not prescription:
            return jsonify({'error': 'Not found'}), 404
        
        return jsonify(prescription), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
