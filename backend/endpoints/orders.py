# backend/endpoints/orders.py
"""
Order management endpoints
"""

from flask import Blueprint, request, jsonify
from database import execute_query, execute_insert
import uuid
import math

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/create/<string:user_id>', methods=['POST'])
def create_order(user_id):
    """Create order from cart items"""
    try:
        data = request.json
        payment_method = data.get('paymentMethod', 'card')
        cart_items = data.get('items', [])

        # Generate order details
        order_id = str(uuid.uuid4())
        order_number = f'ORD-{user_id}-{uuid.uuid4().hex[:8]}'
        
        # Validate user_id and convert to int
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid user ID'}), 400

        # Process cart items, validate products, and calculate total
        total = 0.0
        formatted_items = []
        order_items_data = []
        
        if not cart_items:
            return jsonify({'error': 'Cart items are required'}), 400
        
        for i, item in enumerate(cart_items):
            try:
                # Extract item data
                product_id = int(item['product']['id'])
                quantity = item['quantity']
                price = float(item['price'])
                item_total = price * quantity
                
                # Validate product exists in database
                product = execute_query("""
                    SELECT p.*, c.name as category_name
                    FROM products p
                    JOIN categories c ON p.department_id = c.department_id
                    WHERE p.instacart_product_id = %s
                """, [product_id], fetch_one=True)
                
                if not product:
                    return jsonify({'error': f'Product {product_id} not found'}), 400
                
                # Add to totals
                total += item_total
                
                # Store for database insertion
                order_items_data.append({
                    'product_id': product_id,
                    'quantity': quantity,
                    'price': price,
                    'total': item_total,
                    'add_to_cart_order': i + 1
                })
                
                # Format for response (use database product data for accuracy)
                formatted_items.append({
                    'id': str(uuid.uuid4()),
                    'orderId': order_id,
                    'product': {
                        'id': str(product['instacart_product_id']),
                        'sku': f"SKU-{product['instacart_product_id']}",
                        'name': product['name'],
                        'description': product['description'],
                        'price': float(product['price']),
                        'brand': product['brand'],
                        'imageUrl': product['image_url'],
                        'category': {
                            'id': str(product['department_id']),
                            'name': product['category_name']
                        },
                        'stock': 100,
                        'isActive': True,
                        'metadata': {}
                    },
                    'quantity': quantity,
                    'price': price,
                    'total': item_total,
                    'addToCartOrder': i + 1,
                    'reordered': False
                })
                
            except Exception as item_error:
                return jsonify({'error': f'Error processing item {i}: {str(item_error)}'}), 400

        # Save order to database
        try:
            execute_insert("""
                INSERT INTO orders (id, user_id, order_number, status, total, payment_method, payment_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, [order_id, user_id_int, order_number, 'confirmed', total, payment_method, 'paid'], returning=False)
        except Exception as order_error:
            return jsonify({'error': f'Failed to create order: {str(order_error)}'}), 500

        # Save order items to database
        for i, item_data in enumerate(order_items_data):
            try:
                execute_insert("""
                    INSERT INTO order_items (order_id, product_id, quantity, price, total, add_to_cart_order)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, [order_id, item_data['product_id'], item_data['quantity'], 
                      item_data['price'], item_data['total'], item_data['add_to_cart_order']], returning=False)
            except Exception as item_error:
                return jsonify({'error': f'Failed to create order item {i}: {str(item_error)}'}), 500

        # Return complete order data
        return jsonify({
            'id': order_id,
            'orderNumber': order_number,
            'userId': str(user_id),
            'status': 'confirmed',
            'items': formatted_items,
            'total': total,
            'paymentMethod': payment_method,
            'paymentStatus': 'paid',
            'metadata': {}
        })

    except Exception as e:
        print(f"Create order error: {str(e)}")
        return jsonify({'error': 'Failed to create order'}), 500


@orders_bp.route('/user/<string:user_id>', methods=['GET'])
def get_user_orders(user_id):
    """Get user's orders"""
    try:
        # Convert string ID to int for database query
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid user ID'}), 400

        # Pagination
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        offset = (page - 1) * limit
        
        # Status filtering
        status = request.args.get('status')
        
        # Build query with optional status filter
        where_clause = "WHERE user_id = %s"
        query_params = [user_id_int]
        
        if status:
            where_clause += " AND status = %s"
            query_params.append(status)

        # Get total order count for the user (with status filter)
        total_orders_query = execute_query(
            f"SELECT COUNT(*) as count FROM orders {where_clause}",
            query_params,
            fetch_one=True
        )
        total_orders = total_orders_query['count'] if total_orders_query else 0

        orders = execute_query(f"""
            SELECT * FROM orders
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, query_params + [limit, offset])

        formatted_orders = []
        for order in orders:
            # Get order items
            items = execute_query("""
                SELECT oi.*, p.name, p.description, p.brand, p.image_url,
                       c.department_id, c.name as category_name
                FROM order_items oi
                JOIN products p ON oi.product_id = p.instacart_product_id
                JOIN categories c ON p.department_id = c.department_id
                WHERE oi.order_id = %s
            """, [order['id']])

            formatted_items = []
            for item in items:
                formatted_items.append({
                    'id': item['id'],
                    'orderId': item['order_id'],
                    'product': {
                        'id': str(item['product_id']),
                        'sku': f"SKU-{item['product_id']}",
                        'name': item['name'],
                        'description': item['description'],
                        'price': float(item['price']),
                        'brand': item['brand'],
                        'imageUrl': item['image_url'],
                        'category': {
                            'id': str(item['department_id']),
                            'name': item['category_name']
                        },
                        'stock': 100,
                        'isActive': True,
                        'metadata': {}
                    },
                    'quantity': item['quantity'],
                    'price': float(item['price']),
                    'total': float(item['total']),
                    'addToCartOrder': item['add_to_cart_order'],
                    'reordered': item['reordered']
                })

            formatted_orders.append({
                'id': order['id'],
                'orderNumber': order['order_number'],
                'userId': str(order['user_id']),
                'status': order['status'],
                'items': formatted_items,
                'total': float(order['total']),
                'paymentMethod': order['payment_method'] or 'card',
                'paymentStatus': order['payment_status'] or 'paid',
                'metadata': {},
                'orderSequence': order['order_sequence'],
                'daysSincePriorOrder': float(order['days_since_prior_order']) if order['days_since_prior_order'] else None,
                'orderDow': order['order_dow'],
                'orderHourOfDay': order['order_hour_of_day'],
                'createdAt': order['created_at'].isoformat() if order['created_at'] else None,
                'updatedAt': order['updated_at'].isoformat() if order['updated_at'] else None
            })

        return jsonify({
            'orders': formatted_orders,
            'total': total_orders,
            'page': page,
            'totalPages': math.ceil(total_orders / limit) if limit > 0 else 1,
            'hasMore': (page * limit) < total_orders
        })

    except Exception as e:
        print(f"Get orders error: {str(e)}")
        return jsonify({'error': 'Failed to fetch orders'}), 500


@orders_bp.route('/<string:order_id>', methods=['GET'])
def get_order(order_id):
    """Get single order"""
    try:
        order = execute_query(
            "SELECT * FROM orders WHERE id = %s",
            [order_id],
            fetch_one=True
        )

        if not order:
            return jsonify({'error': 'Order not found'}), 404

        # Get order items
        items = execute_query("""
            SELECT oi.*, p.name, p.description, p.brand, p.image_url,
                    c.department_id, c.name as category_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.instacart_product_id
            JOIN categories c ON p.department_id = c.department_id
            WHERE oi.order_id = %s
        """, [order['id']])

        formatted_items = []
        for item in items:
            formatted_items.append({
                'id': item['id'],
                'orderId': item['order_id'],
                'product': {
                    'id': str(item['product_id']),
                    'sku': f"SKU-{item['product_id']}",
                    'name': item['name'],
                    'description': item['description'],
                    'price': float(item['price']),
                    'brand': item['brand'],
                    'imageUrl': item['image_url'],
                    'category': {
                        'id': str(item['department_id']),
                        'name': item['category_name']
                    },
                    'stock': 100,
                    'isActive': True,
                    'metadata': {}
                },
                'quantity': item['quantity'],
                'price': float(item['price']),
                'total': float(item['total']),
                'addToCartOrder': item['add_to_cart_order'],
                'reordered': item['reordered']
            })

        return jsonify({
            'id': order['id'],
            'orderNumber': order['order_number'],
            'userId': str(order['user_id']),
            'status': order['status'],
            'items': formatted_items,
            'total': float(order['total']),
            'paymentMethod': order['payment_method'] or 'card',
            'paymentStatus': order['payment_status'] or 'paid',
            'metadata': {},
            'createdAt': order['created_at'].isoformat() if order['created_at'] else None
        })

    except Exception as e:
        print(f"Get order error: {str(e)}")
        return jsonify({'error': 'Failed to fetch order'}), 500