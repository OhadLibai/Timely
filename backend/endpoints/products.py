# backend/endpoints/products.py
"""
Product browsing endpoints
"""

from flask import Blueprint, request, jsonify
from database import execute_query, get_db_cursor
import math

products_bp = Blueprint('products', __name__)


@products_bp.route('', methods=['GET'])
def get_products():
    """
    Get products with filtering and pagination
    """
    try:
        # Parse query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        search = request.args.get('search', '')
        categories = request.args.getlist('categories[]')
        sort = request.args.get('sort', 'name')
        
        offset = (page - 1) * limit
        
        # Build query
        query = """
            SELECT p.*, c.name as category_name, c.image_url as category_image
            FROM products p
            JOIN categories c ON p.department_id = c.department_id
            WHERE p.is_active = true
        """
        params = []
        
        # Add search filter
        if search:
            query += " AND (p.name ILIKE %s OR p.description ILIKE %s)"
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern])
        
        # Add category filter
        if categories:
            placeholders = ','.join(['%s'] * len(categories))
            query += f" AND p.department_id IN ({placeholders})"
            params.extend([int(cat) for cat in categories])
        
        # Count total items
        count_query = f"SELECT COUNT(*) as total FROM ({query}) as filtered"
        total_result = execute_query(count_query, params, fetch_one=True)
        total = total_result['total'] if total_result else 0
        
        # Add sorting
        sort_options = {
            'name': 'p.name',
            'price': 'p.price',
            'price_desc': 'p.price DESC'
        }
        order_by = sort_options.get(sort, 'p.name')
        query += f" ORDER BY {order_by}"
        
        # Add pagination
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Execute query
        products = execute_query(query, params)
        
        # Format products
        formatted_products = []
        for product in products:
            formatted_products.append({
                'id': str(product['instacart_product_id']),
                'sku': f"SKU-{product['instacart_product_id']}",
                'name': product['name'],
                'description': product['description'],
                'price': float(product['price']),
                'brand': product['brand'],
                'imageUrl': product['image_url'] or product['category_image'],
                'category': {
                    'id': str(product['department_id']),
                    'name': product['category_name']
                },
                'stock': 100,  # Default stock
                'isActive': product['is_active'],
                'metadata': {}
            })
        
        return jsonify({
            'products': formatted_products,
            'total': total,
            'page': page,
            'totalPages': math.ceil(total / limit) if limit > 0 else 1,
            'hasMore': page * limit < total
        })
        
    except Exception as e:
        print(f"Get products error: {str(e)}")
        return jsonify({'error': 'Failed to fetch products'}), 500


@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """
    Get single product by ID
    """
    try:
        product = execute_query("""
            SELECT p.*, c.name as category_name, c.image_url as category_image
            FROM products p
            JOIN categories c ON p.department_id = c.department_id
            WHERE p.instacart_product_id = %s
        """, [product_id], fetch_one=True)
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({
            'id': str(product['instacart_product_id']),
            'sku': f"SKU-{product['instacart_product_id']}",
            'name': product['name'],
            'description': product['description'],
            'price': float(product['price']),
            'brand': product['brand'],
            'imageUrl': product['image_url'] or product['category_image'],
            'category': {
                'id': str(product['department_id']),
                'name': product['category_name']
            },
            'stock': 100,
            'isActive': product['is_active'],
            'metadata': {}
        })
        
    except Exception as e:
        print(f"Get product error: {str(e)}")
        return jsonify({'error': 'Failed to fetch product'}), 500


@products_bp.route('/categories', methods=['GET'])
def get_categories():
    """
    Get all product categories
    """
    try:
        categories = execute_query("""
            SELECT department_id, name, description, image_url, is_active
            FROM categories
            WHERE is_active = true
            ORDER BY name
        """)
        
        formatted_categories = []
        for cat in categories:
            formatted_categories.append({
                'id': str(cat['department_id']),
                'name': cat['name'],
                'description': cat['description'],
                'imageUrl': cat['image_url']
            })
        
        return jsonify(formatted_categories)
        
    except Exception as e:
        print(f"Get categories error: {str(e)}")
        return jsonify({'error': 'Failed to fetch categories'}), 500