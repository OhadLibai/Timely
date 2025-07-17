# backend/endpoints/favorites.py
"""
Favorites management endpoints
"""

from flask import Blueprint, request, jsonify
from database import execute_query, execute_delete
import uuid

favorites_bp = Blueprint('favorites', __name__)


@favorites_bp.route('/user/<string:user_id>', methods=['GET'])
def get_favorites(user_id):
    """Get user's favorites"""
    try:
        # Handle unauthenticated users gracefully
        if user_id == 'undefined' or user_id == 'null' or not user_id:
            return jsonify([])

        # Convert string ID to int for database query
        try:
            user_id_int = int(user_id)
        except ValueError:
            return jsonify({'error': 'Invalid user ID'}), 400

        favorites = execute_query("""
            SELECT f.id as favorite_id, f.user_id, f.product_id, 
                   p.instacart_product_id, p.name, p.description, p.price, p.brand, p.image_url, p.is_active, p.department_id,
                   c.name as category_name, c.image_url as category_image
            FROM favorites f
            JOIN products p ON f.product_id = p.instacart_product_id
            JOIN categories c ON p.department_id = c.department_id
            WHERE f.user_id = %s
        """, [user_id_int])

        formatted_favorites = []
        for fav in favorites:
            favorite_item = {
                'id': fav['favorite_id'],
                'userId': str(user_id_int),
                'product': {
                    'id': str(fav['product_id']),
                    'sku': f"SKU-{fav['product_id']}",
                    'name': fav['name'],
                    'description': fav['description'],
                    'price': float(fav['price']),
                    'brand': fav['brand'],
                    'imageUrl': fav['image_url'] or fav['category_image'],
                    'category': {
                        'id': str(fav['department_id']),
                        'name': fav['category_name']
                    },
                    'stock': 100,
                    'isActive': fav['is_active'],
                    'metadata': {}
                }
            }
            formatted_favorites.append(favorite_item)

        return jsonify(formatted_favorites)

    except Exception as e:
        print(f"Get favorites error: {str(e)}")
        return jsonify({'error': 'Failed to fetch favorites'}), 500


@favorites_bp.route('/user/<string:user_id>/add', methods=['POST'])
def add_favorite(user_id):
    """Add product to favorites"""
    try:
        data = request.json

        product_id_str = data.get('productId')
        if not product_id_str:
            return jsonify({'error': 'Product ID is required'}), 400
        try:
            product_id = int(product_id_str)
        except (ValueError, TypeError):
            return jsonify({'error': f'Invalid product ID: {product_id_str}'}), 400

        # Convert string ID to int for database query
        try:
            user_id_int = int(user_id)
        except ValueError:
            return jsonify({'error': 'Invalid ID params'}), 400

        # Check if user exists
        user_exists = execute_query(
            "SELECT instacart_user_id FROM users WHERE instacart_user_id = %s",
            [user_id_int],
            fetch_one=True
        )

        if not user_exists:
            return jsonify({'error': 'User not found'}), 404

        # Check if product exists
        product_exists = execute_query(
            "SELECT instacart_product_id FROM products WHERE instacart_product_id = %s",
            [product_id],
            fetch_one=True
        )

        if not product_exists:
            return jsonify({'error': 'Product not found'}), 404

        # Check if already favorited
        existing = execute_query(
            "SELECT id FROM favorites WHERE user_id = %s AND product_id = %s",
            [user_id_int, product_id],
            fetch_one=True
        )

        if existing:
            return jsonify({'message': 'Already favorited'})

        # Add favorite
        execute_query(
            "INSERT INTO favorites (id, user_id, product_id) VALUES (%s, %s, %s) RETURNING *",
            [str(uuid.uuid4()), user_id_int, product_id],
            fetch_one=True
        )

        # Return success message instead of calling get_favorites
        return jsonify({'message': 'Added to favorites'})

    except Exception as e:
        print(f"Add favorite error: {str(e)}")
        return jsonify({'error': 'Failed to add favorite'}), 500


@favorites_bp.route('/user/<string:user_id>/<string:product_id>', methods=['DELETE'])
def remove_favorite(user_id, product_id):
    """Remove product from favorites"""
    try:
        # Convert string IDs to int for database query
        try:
            user_id_int = int(user_id)
            product_id_int = int(product_id)
        except ValueError:
            return jsonify({'error': 'Invalid user ID or product ID'}), 400

        # Simple direct query without execute_delete
        import psycopg2.extras
        from flask import current_app
        conn = current_app.db_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM favorites WHERE user_id = %s AND product_id = %s",
                [user_id_int, product_id_int]
            )
            conn.commit()
            return jsonify({'message': 'Favorite removed'})
        finally:
            cur.close()
            current_app.db_pool.putconn(conn)

    except Exception as e:
        print(f"Remove favorite error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Failed to remove favorite'}), 500


