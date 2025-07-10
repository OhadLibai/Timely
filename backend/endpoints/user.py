# backend/endpoints/user.py
"""
User profile endpoints
"""

from flask import Blueprint, request, jsonify
from database import execute_query

user_bp = Blueprint('user', __name__)


@user_bp.route('/<int:user_id>/profile', methods=['GET'])
def get_profile(user_id):
    """Get user profile"""
    try:
        user = execute_query(
            "SELECT * FROM users WHERE instacart_user_id = %s",
            [user_id],
            fetch_one=True
        )
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'id': str(user['instacart_user_id']),
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'email': user['email'],
            'phone': None,
            'address': None
        })
        
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500


@user_bp.route('/<int:user_id>/profile', methods=['PUT'])
def update_profile(user_id):
    """Update user profile"""
    try:
        data = request.json
        
        execute_query("""
            UPDATE users 
            SET first_name = %s, last_name = %s, updated_at = CURRENT_TIMESTAMP
            WHERE instacart_user_id = %s
        """, [data.get('firstName'), data.get('lastName'), user_id])
        
        return get_profile(user_id)
        
    except Exception as e:
        print(f"Update profile error: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500


@user_bp.route('/<int:user_id>/account', methods=['DELETE'])
def delete_account(user_id):
    """Delete user account"""
    try:
        # For safety, just deactivate instead of delete
        execute_query(
            "UPDATE users SET is_active = false WHERE instacart_user_id = %s",
            [user_id]
        )
        
        return jsonify({'message': 'Account deleted successfully'})
        
    except Exception as e:
        print(f"Delete account error: {str(e)}")
        return jsonify({'error': 'Failed to delete account'}), 500
