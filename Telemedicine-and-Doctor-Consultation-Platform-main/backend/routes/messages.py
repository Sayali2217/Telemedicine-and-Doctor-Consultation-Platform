from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required

bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@bp.route('/consultation/<consultation_id>', methods=['GET'])
@token_required
def get_messages(consultation_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT id, consultation_id as consultationId, sender_id as senderId, 
                      sender_role as senderRole, message_text as messageText, sent_at as sentAt
               FROM consultation_messages 
               WHERE consultation_id = %s
               ORDER BY sent_at ASC''',
            (consultation_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'data': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/send', methods=['POST'])
@token_required
def send_message():
    try:
        data = request.get_json()
        consultation_id = data.get('consultationId')
        sender_id = data.get('senderId')
        sender_role = data.get('senderRole')
        message_text = data.get('messageText')
        
        if not consultation_id or not sender_id or not sender_role or not message_text:
            return jsonify({
                'error': 'consultationId, senderId, senderRole, and messageText are required'
            }), 400
        
        if sender_role not in ['patient', 'doctor']:
            return jsonify({'error': 'Invalid sender role. Must be patient or doctor'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            '''INSERT INTO consultation_messages 
               (consultation_id, sender_id, sender_role, message_text) 
               VALUES (%s, %s, %s, %s)''',
            (consultation_id, sender_id, sender_role, message_text)
        )
        conn.commit()
        
        cursor.execute(
            '''SELECT id, consultation_id as consultationId, sender_id as senderId, 
                      sender_role as senderRole, message_text as messageText, sent_at as sentAt
               FROM consultation_messages 
               WHERE consultation_id = %s 
               ORDER BY sent_at DESC LIMIT 1''',
            (consultation_id,)
        )
        message = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not message:
            return jsonify({'error': 'Failed to retrieve saved message'}), 500
        
        return jsonify(message), 201
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<message_id>', methods=['DELETE'])
@token_required
def delete_message(message_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM consultation_messages WHERE id = %s', (message_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Message deleted'}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
