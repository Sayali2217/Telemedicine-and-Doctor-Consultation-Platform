from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required

bp = Blueprint('doctors', __name__, url_prefix='/api/doctors')

@bp.route('/', methods=['GET'])
@token_required
def get_doctors():
    try:
        status = request.args.get('status')
        speciality = request.args.get('speciality')
        q = request.args.get('q')
        
        query = 'SELECT * FROM doctors WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = %s'
            params.append(status)
        if speciality:
            query += ' AND LOWER(speciality) LIKE %s'
            params.append(f'%{speciality.lower()}%')
        if q:
            query += ' AND LOWER(name) LIKE %s'
            params.append(f'%{q.lower()}%')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'data': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['GET'])
@token_required
def get_doctor(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM doctors WHERE id = %s', (id,))
        doctor = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        return jsonify(doctor), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_doctor():
    try:
        data = request.get_json()
        name = data.get('name')
        speciality = data.get('speciality')
        
        if not name or not speciality:
            return jsonify({'error': 'Name and speciality required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get count for ID
        cursor.execute('SELECT COUNT(*) as count FROM doctors')
        result = cursor.fetchone()
        count = result['count'] + 1
        new_id = f'D{str(count).zfill(2)}'
        
        # Insert doctor
        cursor.execute(
            'INSERT INTO doctors (id, name, speciality, status) VALUES (%s, %s, %s, %s)',
            (new_id, name, speciality, 'available')
        )
        conn.commit()
        
        # Get the created doctor
        cursor.execute('SELECT * FROM doctors WHERE id = %s', (new_id,))
        doctor = cursor.fetchone()
        cursor.close()
        conn.close()
        
        return jsonify(doctor), 201
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['PATCH'])
@token_required
def update_doctor(id):
    try:
        data = request.get_json()
        updates = []
        params = []
        
        fields = ['name', 'speciality', 'status']
        
        for field in fields:
            if field in data and data[field] is not None:
                updates.append(f'{field} = %s')
                params.append(data[field])
        
        if not updates:
            return jsonify({'error': 'Nothing to update'}), 400
        
        params.append(id)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE doctors SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        
        cursor.execute('SELECT * FROM doctors WHERE id = %s', (id,))
        doctor = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        return jsonify(doctor), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route("/<id>", methods=["DELETE"])
@token_required
def delete_doctor(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if doctor exists
        cursor.execute("SELECT * FROM doctors WHERE id = %s", (id,))
        doctor = cursor.fetchone()
        
        if not doctor:
            cursor.close()
            conn.close()
            return jsonify({"error": "Doctor not found"}), 404
        
        # Delete doctor
        cursor.execute("DELETE FROM doctors WHERE id = %s", (id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Doctor deleted successfully", "doctor": doctor}), 200
    
    except Exception as err:
        return jsonify({"error": "Database error", "message": str(err)}), 500
