# ml-service/src/database/models.py
# FIXED: SQLAlchemy models matching backend schema exactly

from sqlalchemy import Column, String, Integer, DateTime, DECIMAL, Boolean, ForeignKey, Text, JSON, Time
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
import uuid
from datetime import datetime

Base = declarative_base()

class User(Base):
    """User model matching backend schema"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    role = Column(String(50), default='user')
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    phone = Column(String(20))
    date_of_birth = Column(DateTime)
    last_login_at = Column(DateTime)             # ADDED: Missing field
    reset_password_token = Column(String(255))   # ADDED: Missing field  
    reset_password_expires = Column(DateTime)    # ADDED: Missing field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    orders = relationship("Order", back_populates="user")

class Category(Base):
    """Category model matching backend schema"""
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
    """Product model matching backend schema"""
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
    payment_method = Column(String(50))
    payment_status = Column(String(50), default='pending')
    notes = Column(Text)
    metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    """Order item model matching backend schema"""
    __tablename__ = 'order_items'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey('orders.id'), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    total = Column(DECIMAL(10, 2), nullable=False)
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

# ============================================================================
# REMOVED COMPLEX FIELDS FROM OLD MODEL:
# - dietary_restrictions: ARRAY(String) - Complex dietary management
# - preferred_brands: ARRAY(String) - Brand preference tracking  
# - excluded_categories: ARRAY(UUID) - Category exclusions
# - max_budget: DECIMAL(10,2) - Budget management
# - notification_preferences: JSON - Complex notification settings
#
# REASON FOR REMOVAL:
# These fields were part of a more complex user preference system that is
# not needed for the current dev/test stage focused on core ML functionality.
# The simplified model matches the backend exactly and eliminates potential
# inconsistencies while maintaining all fields required for the 4 core demands.
# ============================================================================