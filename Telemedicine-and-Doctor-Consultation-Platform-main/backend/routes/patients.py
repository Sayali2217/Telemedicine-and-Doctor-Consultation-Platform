from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required

bp = Blueprint('patients', __name__, url_prefix='/api/patients')

@bp.route('/', methods=['GET'])
@token_required
def get_patients():
    try:
        status = request.args.get('status')
        city = request.args.get('city')
        q = request.args.get('q')
        
        query = 'SELECT * FROM patients WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = %s'
            params.append(status)
        if city:
            query += ' AND LOWER(city) LIKE %s'
            params.append(f'%{city.lower()}%')
        if q:
            query += ' AND LOWER(name) LIKE %s'
            params.append(f'%{q.lower()}%')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Format response
        formatted = [dict(r, condition=r.get('condition_note')) for r in rows]
        
        return jsonify({'count': len(rows), 'data': formatted}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['GET'])
@token_required
def get_patient(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM patients WHERE id = %s', (id,))
        patient = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        patient['condition'] = patient.get('condition_note')
        return jsonify(patient), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_patient():
    try:
        data = request.get_json()
        name = data.get('name')
        age = data.get('age')
        city = data.get('city')
        condition = data.get('condition')
        
        if not name:
            return jsonify({'error': 'Name required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get count for ID
        cursor.execute('SELECT COUNT(*) as count FROM patients')
        result = cursor.fetchone()
        count = result['count'] + 1
        new_id = f'P{str(count).zfill(2)}'
        
        # Insert patient
        cursor.execute(
            'INSERT INTO patients (id, name, age, city, condition_note, status) VALUES (%s, %s, %s, %s, %s, %s)',
            (new_id, name, age, city, condition, 'active')
        )
        conn.commit()
        
        # Get the created patient
        cursor.execute('SELECT * FROM patients WHERE id = %s', (new_id,))
        patient = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify(patient), 201
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['PATCH'])
@token_required
def update_patient(id):
    try:
        data = request.get_json()
        updates = []
        params = []
        
        fields = ['name', 'age', 'city', 'condition_note', 'status']
        
        for field in fields:
            if field in data and data[field] is not None:
                updates.append(f'{field} = %s')
                params.append(data[field])
        
        # Handle alternative mapping for 'condition'
        if 'condition' in data and data['condition'] is not None:
            if 'condition_note = %s' not in updates:
                updates.append('condition_note = %s')
                params.append(data['condition'])
        
        if not updates:
            return jsonify({'error': 'Nothing to update'}), 400
        
        params.append(id)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE patients SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        
        cursor.execute('SELECT * FROM patients WHERE id = %s', (id,))
        patient = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        return jsonify(patient), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
