# backend/endpoints/admin.py
"""
Admin endpoints for demo user creation and model evaluation
"""

from flask import Blueprint, request, jsonify, current_app
from database import execute_query, get_db_cursor
from passlib.hash import bcrypt
import pandas as pd
import os
import random
import string
import uuid
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/demo/seed-user/<string:instacart_user_id>', methods=['POST'])
def seed_demo_user(instacart_user_id):
    """
    Create demo user with historical data from Instacart (Demand #1)
    Credentials form:
        - email : demo<id>@timely.com
        - password : demo_<id>
    """
    try:
        # Check if user exists in Instacart data
        ml_engine = current_app.ml_engine
        if instacart_user_id not in ml_engine.csv_data_history:
            return jsonify({
                'error': f'Instacart user {instacart_user_id} not found in dataset'
            }), 404
        
        instacart_user_id_int = int(instacart_user_id)
        
        # Check if user already exists
        existing = execute_query(
            "SELECT instacart_user_id FROM users WHERE instacart_user_id = %s",
            [instacart_user_id_int],
            fetch_one=True
        )
        
        if existing:
            return jsonify({
                'success': False,
                'message': f'This user is already created, try another one',
                'userId': str(instacart_user_id)
            }), 200
        
        # Generate credentials
        email = f'demo{instacart_user_id}@timely.com'
        password = f'demo_{instacart_user_id}'
        hashed_password = bcrypt.hash(password)
        
        # Create user
        with get_db_cursor() as cur:
            cur.execute("""
                INSERT INTO users (
                    instacart_user_id, email, password, first_name, last_name,
                    role, is_active, email_verified, is_demo_user
                ) VALUES (%s, %s, %s, %s, %s, 'customer', true, true, true)
            """, [
                instacart_user_id_int, email, hashed_password,
                'Demo', f'User {instacart_user_id_int}'
            ])
        
        # Import order history
        orders_imported_num, items_imported_num = import_order_history(instacart_user_id_int) 
        
        return jsonify({
            'success': True,
            'credentials': {
                'email': email,
                'password': password
            },
            'userId': str(instacart_user_id),
            'ordersImportedNumber': str(orders_imported_num), # number of orders found for this user
            'itemsImportNumber': str(items_imported_num),  
            'message': f'User {instacart_user_id_int} had {orders_imported_num} historical orders and {items_imported_num} items'
        })
        
    except Exception as e:
        print(f"Seed user error: {str(e)}")
        return jsonify({'error': 'Failed to create demo user'}), 500


@admin_bp.route('/demo/user-prediction/<string:user_id>', methods=['GET'])
def get_user_prediction_comparison(user_id):
    """
    Get prediction comparison for demo (Demand #3)
    """
    try:
        # Convert string ID to int for database query
        try:
            user_id_int = int(user_id)
        except ValueError:
            return jsonify({'error': 'Invalid user ID'}), 400
        
        # Generate prediction
        ml_engine = current_app.ml_engine
        prediction = ml_engine.predict_basket(user_id, use_csv_data=True)
        
        if not prediction['success']:
            return jsonify({
                'error': prediction.get('error', 'Prediction failed')
            }), 400

        with get_db_cursor() as cur:
            # Predicted products
            predicted_basket = []

            # Format predicted items
            for product_id in prediction['items']:
                cur.execute("""
                    SELECT p.*, c.name as category_name
                    FROM products p
                    JOIN categories c ON p.department_id = c.department_id
                    WHERE p.instacart_product_id = %s
                """, [product_id])
                
                product = cur.fetchone()
                if product:
                    predicted_basket.append(format_product(product))
            
            # Get ground truth
            ground_truth_basket = []
            future_df = pd.read_csv('/app/data/dataset/instacart_future.csv')
            user_future = future_df[future_df['user_id'] == user_id_int]
            
            if not user_future.empty:
                for product_id in user_future['product_id'].unique():
                    cur.execute("""
                        SELECT p.*, c.name as category_name
                        FROM products p
                        JOIN categories c ON p.department_id = c.department_id
                        WHERE p.instacart_product_id = %s
                    """, [int(product_id)])
                    
                    product = cur.fetchone()
                    if product:
                        ground_truth_basket.append(format_product(product))

        limit_basket_size = min(len(ground_truth_basket),len(predicted_basket))
        predicted_basket = predicted_basket[:limit_basket_size]
        ground_truth_basket = ground_truth_basket[:limit_basket_size]
        
        return jsonify({
            'userId': str(user_id),
            'predictedBasket': predicted_basket,
            'groundTruthBasket': ground_truth_basket
        })
        
    except Exception as e:
        print(f"Prediction comparison error: {str(e)}")
        return jsonify({'error': 'Failed to generate comparison'}), 500
        

def import_order_history(user_id:int):
    """
    Import user's order history from Instacart CSV
    """
    try:
        # Load history data
        history_df = pd.read_csv('/app/data/dataset/instacart_history.csv')
        user_history = history_df[history_df['user_id'] == user_id] # string comparison or ints?
        
        if user_history.empty:
            return 0, 0
        
        orders_created = 0
        num_of_items = 0
        current_date = datetime.now()
        
        with get_db_cursor() as cur:
            # Group by order number
            for order_num, order_data in user_history.groupby('order_number'):
                # Calculate order date
                days_offset = int(order_data['days_since_prior_order'].iloc[0]) if 'days_since_prior_order' in order_data else 7
                order_date = current_date - timedelta(days=int(order_num * 7 + days_offset))
                
                # Create order
                order_id = str(uuid.uuid4())
                order_total = 0.0
                
                cur.execute("""
                    INSERT INTO orders (
                        id, user_id, order_number, status, total,
                        order_sequence, days_since_prior_order,
                        order_dow, order_hour_of_day, created_at
                    ) VALUES (%s, %s, %s, 'completed', 0, %s, %s, %s, %s, %s)
                """, [
                    order_id, user_id, f'ORD-{user_id}-{order_num}',
                    int(order_num), float(days_offset),
                    order_data['order_dow'].iloc[0] if 'order_dow' in order_data else 0,
                    order_data['order_hour_of_day'].iloc[0] if 'order_hour_of_day' in order_data else 10,
                    order_date
                ])
                
                # Add order items
                for _, item in order_data.iterrows():
                    # Get product price
                    cur.execute(
                        "SELECT price FROM products WHERE instacart_product_id = %s",
                        [int(item['product_id'])]
                    )
                    price_row = cur.fetchone()
                    
                    if price_row:
                        price = float(price_row['price'])
                        quantity = 1
                        item_total = price * quantity
                        order_total += item_total
                        
                        cur.execute("""
                            INSERT INTO order_items (
                                id, order_id, product_id, quantity, price, total,
                                add_to_cart_order, reordered
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, [
                            str(uuid.uuid4()), order_id, int(item['product_id']),
                            quantity, price, item_total,
                            item.get('add_to_cart_order', 1),
                            bool(item.get('reordered', 0))
                        ])
                        num_of_items += 1
                
                # Update order total
                cur.execute(
                    "UPDATE orders SET total = %s WHERE id = %s",
                    [order_total, order_id]
                )
                
                orders_created += 1
        
        return orders_created, num_of_items
        
    except Exception as e:
        print(f"Import history error: {str(e)}")
        return 0, 0


def format_product(product):
    """Format product for response"""
    return {
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
        'isActive': product['is_active'],
        'metadata': {}
    }
