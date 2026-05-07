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
        updates_inventory = []
        updates_medicines = []
        params_inventory = []
        params_medicines = []
        
        # Fields for inventory table
        inventory_fields = ['qty', 'min_qty', 'expiry_date']
        for field in inventory_fields:
            db_field = 'min_qty' if field == 'minQty' else ('expiry_date' if field == 'expiry' else field)
            if field in data and data[field] is not None:
                updates_inventory.append(f'{db_field} = %s')
                params_inventory.append(data[field])
        
        # Fields for medicines table
        medicine_fields = ['name', 'price']
        for field in medicine_fields:
            if field in data and data[field] is not None:
                updates_medicines.append(f'{field} = %s')
                params_medicines.append(data[field])
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update inventory table
        if updates_inventory:
            params_inventory.append(sku)
            cursor.execute(f"UPDATE inventory SET {', '.join(updates_inventory)} WHERE sku = %s", params_inventory)
        
        # Update medicines table
        if updates_medicines:
            params_medicines.append(sku)
            cursor.execute(f"UPDATE medicines SET {', '.join(updates_medicines)} WHERE sku = %s", params_medicines)
        
        conn.commit()
        
        # Get updated item
        cursor.execute(
            '''SELECT i.*, m.name, m.price 
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

@bp.route("/<sku>", methods=["DELETE"])
@token_required
def delete_inventory_item(sku):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if item exists
        cursor.execute("SELECT * FROM inventory WHERE sku = %s", (sku,))
        item = cursor.fetchone()
        
        if not item:
            cursor.close()
            conn.close()
            return jsonify({"error": "Inventory item not found"}), 404
        
        # Delete from inventory
        cursor.execute("DELETE FROM inventory WHERE sku = %s", (sku,))
        
        # Also delete from medicines table
        cursor.execute("DELETE FROM medicines WHERE sku = %s", (sku,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Inventory item deleted successfully", "item": item}), 200
    
    except Exception as err:
        return jsonify({"error": "Database error", "message": str(err)}), 500
