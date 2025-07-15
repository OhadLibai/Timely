# backend/endpoints/orders.py
"""
Order management endpoints
"""

from flask import Blueprint, request, jsonify
from database import execute_query
import uuid
import math

orders_bp = Blueprint('orders', __name__)


@orders_bp.route('/create/<string:user_id>', methods=['POST'])
def create_order(user_id):
    """Create order from cart"""
    try:
        data = request.json
        cart_id = data.get('cartId')
        payment_method = data.get('paymentMethod', 'card')

        # For simplicity, return mock order
        order_id = str(uuid.uuid4())
        order_number = f'ORD-{user_id}-{uuid.uuid4().hex[:8]}'

        return jsonify({
            'id': order_id,
            'orderNumber': order_number,
            'userId': str(user_id),
            'status': 'confirmed',
            'items': [],
            'total': 0.0,
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