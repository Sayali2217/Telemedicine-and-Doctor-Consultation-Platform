from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required

bp = Blueprint('orders', __name__, url_prefix='/api/orders')

VALID_STATUSES = ['pending', 'rx_pending', 'packing', 'dispatched', 'delivered', 'cancelled']

@bp.route('/', methods=['GET'])
@token_required
def get_orders():
    try:
        patient_id = request.args.get('patientId')
        status = request.args.get('status')
        
        query = 'SELECT * FROM orders WHERE 1=1'
        params = []
        
        if patient_id:
            query += ' AND patient_id = %s'
            params.append(patient_id)
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
            {**r, 'patientId': r['patient_id']}
            for r in rows
        ]
        return jsonify({'count': len(rows), 'data': formatted}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>', methods=['GET'])
@token_required
def get_order(id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM orders WHERE id = %s', (id,))
        order = cursor.fetchone()
        
        if not order:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Order not found'}), 404
        
        cursor.execute('SELECT * FROM order_items WHERE order_id = %s', (id,))
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({
            **order,
            'patientId': order['patient_id'],
            'items': items
        }), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_order():
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        items = data.get('items', [])
        total_amount = data.get('totalAmount')
        prescription_id = data.get('prescriptionId')
        
        if not patient_id or not items:
            return jsonify({'error': 'patientId and items array required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get count for ID
            cursor.execute('SELECT COUNT(*) as count FROM orders')
            result = cursor.fetchone()
            count = result['count'] + 1
            new_id = f'ORD-{8821 + count}'
            
            status = 'rx_pending' if prescription_id else 'pending'
            
            # Create order
            cursor.execute(
                '''INSERT INTO orders 
                   (id, patient_id, prescription_id, total_amount, status, payment_status) 
                   VALUES (%s, %s, %s, %s, %s, %s)''',
                (new_id, patient_id, prescription_id, total_amount or 0, status, 'pending')
            )
            
            # Insert items
            for item in items:
                sku = item.get('sku')
                qty = item.get('qty')
                unit_price = item.get('unitPrice')
                
                if not sku or qty is None or unit_price is None:
                    raise ValueError('Each item must have sku, qty, and unitPrice')
                
                cursor.execute(
                    'INSERT INTO order_items (order_id, sku, qty, unit_price) VALUES (%s, %s, %s, %s)',
                    (new_id, sku, qty, unit_price)
                )
            
            conn.commit()
            
            return jsonify({
                'success': True,
                'id': new_id,
                'patientId': patient_id,
                'itemCount': len(items),
                'totalAmount': total_amount,
                'status': status
            }), 201
        
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()
            conn.close()
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<id>/status', methods=['PATCH'])
@token_required
def update_order_status(id):
    try:
        data = request.get_json()
        status = data.get('status')
        
        if status not in VALID_STATUSES:
            return jsonify({'error': f'Invalid status. Valid: {", ".join(VALID_STATUSES)}'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE orders SET status = %s WHERE id = %s', (status, id))
        conn.commit()
        
        cursor.execute('SELECT * FROM orders WHERE id = %s', (id,))
        order = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not order:
            return jsonify({'error': 'Not found'}), 404
        
        return jsonify(order), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/summary/stats', methods=['GET'])
@token_required
def get_order_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT status, total_amount FROM orders')
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        stats = {
            'total': len(rows),
            'pending': 0,
            'dispatched': 0,
            'delivered': 0,
            'totalRevenue': 0
        }
        
        for row in rows:
            if row['status'] in ['pending', 'rx_pending', 'packing']:
                stats['pending'] += 1
            if row['status'] == 'dispatched':
                stats['dispatched'] += 1
            if row['status'] == 'delivered':
                stats['delivered'] += 1
            if row['status'] != 'cancelled':
                stats['totalRevenue'] += float(row['total_amount'] or 0)
        
        return jsonify(stats), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
