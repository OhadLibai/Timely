# backend/endpoints/auth.py
"""
Authentication endpoints - Simplified dummy implementation
No real authentication, just returns tokens for frontend compatibility
"""

from flask import Blueprint, request, jsonify
from database import execute_query
from passlib.hash import bcrypt
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

def format_user_response(user):
    """Format user data for response"""
    if not user:
        return None
    
    return {
        'id': str(user['instacart_user_id']),
        'email': user['email'],
        'firstName': user['first_name'],
        'lastName': user['last_name'],
        'role': user['role'],
        'isActive': user['is_active'],
        'createdAt': user['created_at'].isoformat() if user['created_at'] else None,
        'updatedAt': user['updated_at'].isoformat() if user['updated_at'] else None
    }


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint - returns dummy tokens
    """
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Get user from database
        user = execute_query(
            "SELECT * FROM users WHERE email = %s",
            [email],
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        password_valid = bcrypt.verify(password, user['password'])
        
        if not password_valid:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Return dummy tokens and user data
        return jsonify({
            'user': format_user_response(user),
            'accessToken': 'dummy_token',
            'refreshToken': 'dummy_token'
        })
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Register endpoint - creates new user
    """
    try:
        data = request.json
        
        # Validate required fields
        required = ['email', 'password', 'firstName', 'lastName']
        for field in required:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if email already exists
        existing = execute_query(
            "SELECT instacart_user_id FROM users WHERE email = %s",
            [data['email']],
            fetch_one=True
        )
        
        if existing:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Find next available negative ID for new users
        max_negative = execute_query(
            "SELECT MIN(instacart_user_id) as min_id FROM users WHERE instacart_user_id < 0",
            fetch_one=True
        )
        
        new_user_id = -3 if not max_negative['min_id'] else max_negative['min_id'] - 1
        
        # Hash password
        hashed_password = bcrypt.hash(data['password'])
        
        # Insert new user
        new_user = execute_query(
            """
            INSERT INTO users (
                instacart_user_id, email, password, first_name, last_name,
                role, is_active, email_verified, is_demo_user
            ) VALUES (%s, %s, %s, %s, %s, 'customer', true, false, false)
            RETURNING *
            """,
            [new_user_id, data['email'], hashed_password, data['firstName'], data['lastName']],
            fetch_one=True
        )
        
        # Return dummy tokens and user data
        return jsonify({
            'user': format_user_response(new_user),
            'accessToken': 'dummy_token',
            'refreshToken': 'dummy_token'
        })
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint - just returns success
    """
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    """
    Refresh token endpoint - returns new dummy tokens
    """
    return jsonify({
        'accessToken': 'dummy_token',
        'refreshToken': 'dummy_token'
    })

# --- DEPRECATED --- #
@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """
    Get current user - expects userId in header or returns first user
    """
    try:
        # Try to get user ID from request
        user_id = request.headers.get('X-User-Id', '-2')  # Default to regular user
        
        user = execute_query(
            "SELECT * FROM users WHERE instacart_user_id = %s",
            [int(user_id)],
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': format_user_response(user)
        })
        
    except Exception as e:
        print(f"Get user error: {str(e)}")
        return jsonify({'error': 'Failed to get user'}), 500