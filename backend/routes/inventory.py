from flask import Blueprint, request, jsonify
from config import get_db_connection
from middleware.auth import token_required

bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

@bp.route('/', methods=['GET'])
@token_required
def get_inventory():
    try:
        low = request.args.get('low')
        
        query = '''SELECT i.*, m.name, m.price 
                   FROM inventory i 
                   JOIN medicines m ON i.sku = m.sku'''
        
        if low == 'true':
            query += ' WHERE i.qty < i.min_qty'
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'data': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<sku>', methods=['GET'])
@token_required
def get_inventory_item(sku):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT i.*, m.name, m.price, m.brand 
               FROM inventory i 
               JOIN medicines m ON i.sku = m.sku 
               WHERE i.sku = %s''',
            (sku,)
        )
        item = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        return jsonify(item), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/', methods=['POST'])
@token_required
def create_inventory():
    try:
        data = request.get_json()
        name = data.get('name')
        qty = data.get('qty')
        min_qty = data.get('minQty')
        price = data.get('price')
        expiry = data.get('expiry')
        
        if not name or qty is None:
            return jsonify({'error': 'name and qty required'}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            # Get count for SKU
            cursor.execute('SELECT COUNT(*) as count FROM medicines')
            result = cursor.fetchone()
            count = result['count'] + 1
            new_sku = f'MED-{str(count).zfill(3)}'
            
            # Insert into medicines
            cursor.execute(
                'INSERT INTO medicines (sku, name, price) VALUES (%s, %s, %s)',
                (new_sku, name, price or 0)
            )
            
            # Insert into inventory
            cursor.execute(
                'INSERT INTO inventory (sku, qty, min_qty, expiry_date) VALUES (%s, %s, %s, %s)',
                (new_sku, qty, min_qty or 20, expiry)
            )
            
            conn.commit()
            
            return jsonify({
                'sku': new_sku,
                'name': name,
                'qty': qty,
                'minQty': min_qty or 20,
                'price': price,
                'expiry': expiry
            }), 201
        
        except Exception as err:
            conn.rollback()
            raise err
        finally:
            cursor.close()
            conn.close()
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/<sku>', methods=['PATCH'])
@token_required
def update_inventory(sku):
    try:
        data = request.get_json()
        updates = []
        params = []
        
        if 'qty' in data and data['qty'] is not None:
            updates.append('qty = %s')
            params.append(data['qty'])
        if 'minQty' in data and data['minQty'] is not None:
            updates.append('min_qty = %s')
            params.append(data['minQty'])
        
        if updates:
            params.append(sku)
            
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(f"UPDATE inventory SET {', '.join(updates)} WHERE sku = %s", params)
            conn.commit()
        else:
            conn = get_db_connection()
            cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM inventory WHERE sku = %s', (sku,))
        item = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        return jsonify(item), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500

@bp.route('/alerts/low-stock', methods=['GET'])
@token_required
def get_low_stock():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT i.*, m.name 
               FROM inventory i 
               JOIN medicines m ON i.sku = m.sku 
               WHERE i.qty < i.min_qty'''
        )
        rows = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return jsonify({'count': len(rows), 'items': rows}), 200
    
    except Exception as err:
        return jsonify({'error': 'Database error', 'message': str(err)}), 500
