from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required
import os
from werkzeug.utils import secure_filename

bp = Blueprint('patients', __name__, url_prefix='/api/patients')

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
        dob = data.get('dob')
        gender = data.get('gender')
        age = data.get('age')
        blood_group = data.get('blood_group')
        height_cm = data.get('height_cm')
        weight_kg = data.get('weight_kg')
        city = data.get('city')
        state = data.get('state')
        address = data.get('address')
        phone = data.get('phone')
        allergies = data.get('allergies')
        condition_note = data.get('condition_note')
        
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
            '''INSERT INTO patients (id, name, dob, gender, age, blood_group, height_cm, weight_kg, city, state, address, phone, allergies, condition_note, status) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
            (new_id, name, dob, gender, age, blood_group, height_cm, weight_kg, city, state, address, phone, allergies, condition_note, 'active')
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

@bp.route('/<id>/documents', methods=['POST'])
@token_required
def upload_document(id):
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Allowed: pdf, jpg, jpeg, png, doc, docx'}), 400
        
        filename = secure_filename(file.filename)
        # Add patient ID prefix to avoid conflicts
        unique_filename = f"{id}_{request.form.get('type', 'document')}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        file.save(file_path)
        
        # Store document info in database (you might want to create a documents table)
        # For now, we'll just return success
        document_info = {
            'id': f"doc_{id}_{int(os.path.getmtime(file_path))}",
            'patientId': id,
            'filename': unique_filename,
            'originalName': filename,
            'type': request.form.get('type', 'document'),
            'filePath': file_path,
            'uploadedAt': os.path.getmtime(file_path)
        }
        
        return jsonify({
            'success': True,
            'message': 'Document uploaded successfully',
            'document': document_info
        }), 201
    
    except Exception as err:
        return jsonify({'error': 'Upload error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['DELETE'])
@token_required
def delete_patient(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if patient exists
        cursor.execute('SELECT * FROM patients WHERE id = %s', (id,))
        patient = cursor.fetchone()
        
        if not patient:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Patient not found'}), 404
        
        # Delete patient
        cursor.execute('DELETE FROM patients WHERE id = %s', (id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Patient deleted successfully', 'patient': patient}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
