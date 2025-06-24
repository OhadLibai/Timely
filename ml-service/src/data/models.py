# ml-service/src/data/models.py
# FIXED: SQLAlchemy models matching backend schema exactly

from sqlalchemy import Column, String, Integer, DateTime, DECIMAL, Boolean, ForeignKey, Text, JSON, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User model matching backend schema exactly"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), default='user')
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # FIXED: Added missing field
    phone = Column(String(20))
    last_login_at = Column(DateTime)
    reset_password_token = Column(String(255))
    reset_password_expires = Column(DateTime)
    metadata = Column(JSON, default=dict)  # FIXED: Added missing field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    orders = relationship("Order", back_populates="user")

class Category(Base):
    """Category model matching backend schema exactly"""
    __tablename__ = 'categories'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text)
    image_url = Column(String(255))
    parent_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'))
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    products = relationship("Product", back_populates="category")

class Product(Base):
    """Product model matching backend schema exactly"""
    __tablename__ = 'products'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku = Column(String(255), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(DECIMAL(10, 2), nullable=False)
    compare_at_price = Column(DECIMAL(10, 2))
    unit = Column(String(50))
    unit_value = Column(DECIMAL(10, 3))
    brand = Column(String(255))
    tags = Column(ARRAY(String))
    image_url = Column(String(255))
    additional_images = Column(ARRAY(String))
    category_id = Column(UUID(as_uuid=True), ForeignKey('categories.id'), nullable=False)
    stock = Column(Integer, default=0)
    track_inventory = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    is_on_sale = Column(Boolean, default=False)
    sale_percentage = Column(DECIMAL(5, 2), default=0)
    
    # FIXED: Added missing analytical fields that may be used by ML features
    view_count = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    avg_rating = Column(DECIMAL(3, 2), default=0)
    review_count = Column(Integer, default=0)
    
    nutritional_info = Column(JSON, default=dict)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    """Order model matching backend schema with ML temporal fields"""
    __tablename__ = 'orders'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    order_number = Column(String(50), unique=True, nullable=False)
    
    # CRITICAL: Temporal fields required by ML model (trained on Instacart data)
    days_since_prior_order = Column(DECIMAL(10, 2), default=0)  # Days since user's previous order
    order_dow = Column(Integer, nullable=False)                 # Day of week (0=Monday, 6=Sunday) 
    order_hour_of_day = Column(Integer, nullable=False)         # Hour of day (0-23)
    
    status = Column(String(50), default='pending')
    subtotal = Column(DECIMAL(10, 2), nullable=False)
    tax = Column(DECIMAL(10, 2), default=0)
    delivery_fee = Column(DECIMAL(10, 2), default=0)
    discount = Column(DECIMAL(10, 2), default=0)
    total = Column(DECIMAL(10, 2), nullable=False)
    
    # FIXED: Added missing address fields
    shipping_address = Column(Text)
    billing_address = Column(Text)
    
    payment_method = Column(String(50))
    payment_status = Column(String(50), default='pending')
    notes = Column(Text)
    
    # FIXED: Added missing timestamp fields
    order_date = Column(DateTime, default=datetime.utcnow)
    shipped_date = Column(DateTime)
    delivered_date = Column(DateTime)
    
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    """Order item model matching backend schema exactly"""
    __tablename__ = 'order_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id'), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    
    # FIXED: Updated field names to match backend exactly
    unit_price = Column(DECIMAL(10, 2), nullable=False)  # Was 'price'
    total_price = Column(DECIMAL(10, 2), nullable=False)  # Was 'total'
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")

class UserPreference(Base):
    """FIXED: User preferences model matching simplified backend schema"""
    __tablename__ = 'user_preferences'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    
    # Core ML prediction preferences (Essential for demo functionality)
    auto_basket_enabled = Column(Boolean, default=True, nullable=False)
    auto_basket_day = Column(Integer, default=0, nullable=False)  # 0=Sunday, 6=Saturday
    auto_basket_time = Column(Time, default='10:00:00', nullable=False)
    
    # Basic UI preferences (Supporting user experience)
    email_notifications = Column(Boolean, default=True, nullable=False)
    dark_mode = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Cart(Base):
    """Cart model for user shopping sessions"""
    __tablename__ = 'carts'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    session_id = Column(String(255))  # For guest carts
    status = Column(String(50), default='active')
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cart_items = relationship("CartItem", back_populates="cart")

class CartItem(Base):
    """Cart item model for shopping sessions"""
    __tablename__ = 'cart_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey('carts.id'), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cart = relationship("Cart", back_populates="cart_items")
    product = relationship("Product")

class PredictedBasket(Base):
    """Predicted basket model for ML predictions"""
    __tablename__ = 'predicted_baskets'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    week_of = Column(DateTime, nullable=False)
    status = Column(String(50), default='generated')  # generated, accepted, rejected
    confidence_score = Column(DECIMAL(5, 4))
    algorithm_version = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    predicted_items = relationship("PredictedBasketItem", back_populates="predicted_basket")

class PredictedBasketItem(Base):
    """Predicted basket item model"""
    __tablename__ = 'predicted_basket_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    predicted_basket_id = Column(UUID(as_uuid=True), ForeignKey('predicted_baskets.id'), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    predicted_quantity = Column(Integer, nullable=False)
    confidence_score = Column(DECIMAL(5, 4))
    reasoning = Column(Text)
    is_accepted = Column(Boolean)
    user_feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    predicted_basket = relationship("PredictedBasket", back_populates="predicted_items")
    product = relationship("Product")

# ============================================================================
# CRITICAL FIXES APPLIED:
# 
# ✅ USER MODEL FIXES:
# - Added missing 'is_admin' field
# - Added missing 'metadata' field
# - Removed fields not in backend ('email_verified', 'date_of_birth')
# 
# ✅ PRODUCT MODEL FIXES:
# - Added missing analytical fields (view_count, purchase_count, etc.)
# - These may be used by ML features for popularity scoring
# 
# ✅ ORDER MODEL FIXES:
# - Added missing address fields (shipping_address, billing_address)
# - Added missing date fields (order_date, shipped_date, delivered_date)
# - Fixed temporal fields for ML consistency
# 
# ✅ ORDER_ITEM MODEL FIXES:
# - Fixed field names to match backend exactly (unit_price, total_price)
# 
# ✅ USER_PREFERENCE MODEL FIXES:
# - Removed complex fields not needed for dev/test stage
# - Simplified to essential fields for ML demo functionality
# 
# ✅ ADDED COMPLETE MODELS:
# - Cart and CartItem models for shopping functionality
# - PredictedBasket models for ML prediction storage
# 
# This eliminates all schema mismatches and provides consistent data access
# for the ML service across all 4 core demands! 🔥
# ============================================================================