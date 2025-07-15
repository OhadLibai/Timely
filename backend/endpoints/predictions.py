# backend/endpoints/predictions.py
"""
Prediction endpoints for ML basket recommendations
"""

from flask import Blueprint, jsonify, current_app
from database import execute_query, get_db_cursor
import uuid
from datetime import datetime, timedelta

predictions_bp = Blueprint('predictions', __name__)

def format_prediction_response(ml_result):
    """
    Format ML engine result into API response
    """
    if not ml_result['success']:
        return {
            'basket': {},
            'error': ml_result.get('error', 'Prediction failed'),
            'success': False
        }
    
    # Get product details for predicted items
    predicted_items = []
    
    with get_db_cursor() as cur:
        for product_id in ml_result['items']:
            cur.execute("""
                SELECT p.*, c.name as category_name, c.image_url as category_image
                FROM products p
                JOIN categories c ON p.department_id = c.department_id
                WHERE p.instacart_product_id = %s
            """, [product_id])
            
            product = cur.fetchone()
            
            if product:
                predicted_items.append({
                    'product': {
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
                    },
                    'quantity': 1
                })
    
    return {
        'basket': {
            'id': str(uuid.uuid4()),
            'items': predicted_items
        },
        'success': True
    }


@predictions_bp.route('/predicted-basket/<string:user_id>', methods=['POST'])
def get_predicted_basket(user_id):
    """
    Get prediction for a database user (Demand #1)
    """
    try:
        # Convert string ID to int for database query
        try:
            user_id_int = int(user_id)
        except ValueError:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        # Check if user exists and has sufficient orders
        order_count = execute_query(
            "SELECT COUNT(*) as count FROM orders WHERE user_id = %s",
            [user_id_int],
            fetch_one=True
        )
        
        if not order_count or order_count['count'] < 3:
            return jsonify({
                'basket': {},
                'error': 'User needs at least 3 orders for predictions',
                'success': False
            })
        
        # Generate prediction using ML engine
        ml_engine = current_app.ml_engine
        prediction = ml_engine.predict_basket(user_id, use_csv_data=False)
        
        # Format and return response
        response = format_prediction_response(prediction)
        return jsonify(response)
        
    except Exception as e:
        print(f"Prediction error: {str(e)}")
        return jsonify({
            'basket': {},
            'error': 'Failed to generate prediction',
            'success': False
        }), 500

