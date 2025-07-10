# backend/app.py
"""
Simplified Flask Backend for Timely
Direct SQL queries, no authentication checks, minimal overhead
"""

import os
from flask import Flask, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.pool import SimpleConnectionPool

# Database configuration (hardcoded for Docker)
DATABASE_CONFIG = {
    'host': 'database',
    'port': 5432,
    'database': 'timely_db',
    'user': 'timely_user',
    'password': 'timely_password'
}

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for frontend
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://frontend:3000"]}})

# Create database connection pool
db_pool = SimpleConnectionPool(
    1, 20,  # min and max connections
    **DATABASE_CONFIG
)

# Make pool available to blueprints
app.db_pool = db_pool

# Initialize ML engine
from ml_engine import get_engine
app.ml_engine = get_engine()

# Import endpoint modules
from endpoints.auth import auth_bp
from endpoints.predictions import predictions_bp
from endpoints.admin import admin_bp
from endpoints.metrics import metrics_bp
from endpoints.products import products_bp
from endpoints.orders import orders_bp
from endpoints.user import user_bp
from endpoints.favorites import favorites_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(metrics_bp, url_prefix='/api/metrics')
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(orders_bp, url_prefix='/api/orders')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(favorites_bp, url_prefix='/api/favorites')

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    """Simple health check"""
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute('SELECT 1')
        cur.close()
        db_pool.putconn(conn)
        return jsonify({'status': 'healthy', 'database': 'connected'})
    except:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 500

# Root endpoint
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'name': 'Timely Backend API',
        'version': '1.0.0',
        'endpoints': ['/api/health', '/api/auth', '/api/predictions', '/api/products', '/api/orders']
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)