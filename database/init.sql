-- database/init.sql
-- FIXED: Complete database schema with ML integration requirements

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FIXED: Products table with instacart_product_id
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(10,2) CHECK (compare_at_price >= 0),
    unit VARCHAR(50),
    unit_value DECIMAL(10,3),
    brand VARCHAR(255),
    tags TEXT[],
    image_url VARCHAR(255),
    additional_images TEXT[],
    category_id UUID NOT NULL REFERENCES categories(id),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    track_inventory BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_on_sale BOOLEAN DEFAULT false,
    sale_percentage DECIMAL(5,2) DEFAULT 0 CHECK (sale_percentage >= 0 AND sale_percentage <= 100),
    nutritional_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    -- CRITICAL: Add instacart_product_id for ML mapping
    instacart_product_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FIXED: Users table with instacart_user_id
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    -- CRITICAL: Add instacart_user_id as proper column
    instacart_user_id INTEGER UNIQUE,
    metadata JSONB DEFAULT '{}',
    last_login_at TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dietary_restrictions TEXT[],
    favorite_categories UUID[],
    notification_preferences JSONB DEFAULT '{}',
    shopping_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FIXED: Orders table with complete temporal fields for ML
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- CRITICAL: Complete temporal fields for TIFU-KNN
    order_sequence INTEGER NOT NULL,                     -- Order position in user's history
    days_since_prior_order DECIMAL(10,2) DEFAULT 0,     -- Days since previous order
    order_dow INTEGER NOT NULL,                         -- Day of week (0=Monday, 6=Sunday)
    order_hour_of_day INTEGER NOT NULL,                 -- Hour of day (0-23)
    eval_set VARCHAR(10) DEFAULT 'prior',               -- Dataset split: prior/train/test
    instacart_order_id INTEGER,                         -- Original Instacart order ID
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FIXED: Order items table with ML fields
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    -- CRITICAL: ML fields from Instacart
    add_to_cart_order INTEGER DEFAULT 1,  -- Position item was added to cart
    reordered BOOLEAN DEFAULT false,       -- Whether item was reordered
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- ML Predictions table (for tracking and comparison)
CREATE TABLE IF NOT EXISTS ml_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    instacart_user_id INTEGER,
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    predicted_items INTEGER[],       -- Instacart product IDs
    actual_items INTEGER[],          -- Ground truth (if available)
    algorithm VARCHAR(50) DEFAULT 'TIFU-KNN',
    confidence_score DECIMAL(5,4),
    metrics JSONB,                   -- Recall, precision, etc.
    source VARCHAR(20) CHECK (source IN ('csv', 'database')),
    k_value INTEGER DEFAULT 20
);

-- User temporal patterns (for caching analysis)
CREATE TABLE IF NOT EXISTS user_temporal_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    avg_days_between_orders DECIMAL(10,2),
    preferred_dow INTEGER[],
    preferred_hours INTEGER[],
    order_frequency VARCHAR(20),
    total_orders INTEGER,
    total_items INTEGER,
    unique_items INTEGER,
    last_analyzed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Model evaluation metrics table
CREATE TABLE IF NOT EXISTS model_evaluation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    algorithm VARCHAR(50) DEFAULT 'TIFU-KNN',
    sample_size INTEGER,
    recall_at_20 DECIMAL(5,4),
    precision_at_20 DECIMAL(5,4),
    f1_at_20 DECIMAL(5,4),
    hit_rate_at_20 DECIMAL(5,4),
    users_evaluated INTEGER,
    evaluation_time_seconds DECIMAL(10,2),
    full_metrics JSONB
);

-- Predicted baskets table (for UI display)
CREATE TABLE IF NOT EXISTS predicted_baskets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_of DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'modified', 'accepted', 'rejected')),
    confidence_score DECIMAL(5,4),
    total_items INTEGER DEFAULT 0,
    total_value DECIMAL(10,2) DEFAULT 0,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Predicted basket items table  
CREATE TABLE IF NOT EXISTS predicted_basket_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    basket_id UUID NOT NULL REFERENCES predicted_baskets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    confidence_score DECIMAL(5,4),
    is_accepted BOOLEAN DEFAULT false,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product views table for tracking
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES products(id),
    session_id VARCHAR(100),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CRITICAL INDEXES FOR ML PERFORMANCE
-- ============================================================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_instacart_id ON users(instacart_user_id) WHERE instacart_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_metadata_instacart ON users((metadata->>'instacart_user_id')) WHERE metadata->>'instacart_user_id' IS NOT NULL;

-- Product lookups
CREATE INDEX IF NOT EXISTS idx_products_instacart_id ON products(instacart_product_id) WHERE instacart_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_metadata_csv ON products((metadata->>'originalCsvId')) WHERE metadata->>'originalCsvId' IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- Order lookups for ML
CREATE INDEX IF NOT EXISTS idx_orders_user_sequence ON orders(user_id, order_sequence);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_temporal ON orders(order_dow, order_hour_of_day);
CREATE INDEX IF NOT EXISTS idx_orders_days_since ON orders(days_since_prior_order);

-- Order items for basket reconstruction
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_position ON order_items(order_id, add_to_cart_order);

-- ML predictions lookup
CREATE INDEX IF NOT EXISTS idx_ml_predictions_user_date ON ml_predictions(user_id, prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_instacart_user ON ml_predictions(instacart_user_id);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user ON product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================================================
-- HELPER FUNCTIONS FOR ML DATA RETRIEVAL
-- ============================================================================

-- Function to get user's basket history in ML format
CREATE OR REPLACE FUNCTION get_user_basket_history(p_user_id UUID)
RETURNS TABLE(
    order_sequence INTEGER,
    basket INTEGER[],
    days_since_prior DECIMAL(10,2),
    order_dow INTEGER,
    order_hour INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.order_sequence,
        ARRAY_AGG(
            COALESCE(p.instacart_product_id, (p.metadata->>'originalCsvId')::INTEGER) 
            ORDER BY oi.add_to_cart_order
        ) as basket,
        o.days_since_prior_order,
        o.order_dow,
        o.order_hour_of_day
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.user_id = p_user_id
    AND (p.instacart_product_id IS NOT NULL OR p.metadata->>'originalCsvId' IS NOT NULL)
    GROUP BY o.id, o.order_sequence, o.days_since_prior_order, 
             o.order_dow, o.order_hour_of_day
    ORDER BY o.order_sequence;
END;
$$ LANGUAGE plpgsql;

-- Function to map Instacart product IDs to internal IDs
CREATE OR REPLACE FUNCTION map_instacart_to_internal_products(p_instacart_ids INTEGER[])
RETURNS TABLE(
    instacart_id INTEGER,
    internal_id UUID,
    name VARCHAR(255),
    price DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.instacart_product_id, (p.metadata->>'originalCsvId')::INTEGER) as instacart_id,
        p.id as internal_id,
        p.name,
        p.price
    FROM products p
    WHERE p.instacart_product_id = ANY(p_instacart_ids)
       OR (p.metadata->>'originalCsvId')::INTEGER = ANY(p_instacart_ids);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Default admin user (password: admin123)
INSERT INTO users (id, email, password, first_name, last_name, role, is_active, email_verified)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@timely.demo',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQYyhaANBnNa',
    'Admin',
    'User',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Sample categories (will be replaced by CSV data)
INSERT INTO categories (id, name, slug, description, sort_order) VALUES
    ('c1234567-89ab-cdef-0123-456789abcdef', 'Produce', 'produce', 'Fresh fruits and vegetables', 1),
    ('c2234567-89ab-cdef-0123-456789abcdef', 'Dairy', 'dairy', 'Milk, cheese, yogurt and more', 2),
    ('c3234567-89ab-cdef-0123-456789abcdef', 'Bakery', 'bakery', 'Fresh bread and baked goods', 3),
    ('c4234567-89ab-cdef-0123-456789abcdef', 'Meat & Seafood', 'meat-seafood', 'Fresh meat and seafood', 4),
    ('c5234567-89ab-cdef-0123-456789abcdef', 'Frozen', 'frozen', 'Frozen foods', 5),
    ('c6234567-89ab-cdef-0123-456789abcdef', 'Beverages', 'beverages', 'Drinks and beverages', 6)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify critical columns exist
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM (
        SELECT 'users.instacart_user_id' as missing WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'instacart_user_id'
        )
        UNION
        SELECT 'products.instacart_product_id' WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'products' AND column_name = 'instacart_product_id'
        )
        UNION
        SELECT 'orders.order_sequence' WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'order_sequence'
        )
    ) missing_cols;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Critical ML columns are missing!';
    ELSE
        RAISE NOTICE 'SUCCESS: All ML integration columns present';
    END IF;
END $$;