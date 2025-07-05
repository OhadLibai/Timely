-- database/init.sql
-- CLEANED: Removed all delivery/tracking tables - Focus on ML basket prediction

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table (schema only)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    -- ML Integration: Map to Instacart departments
    instacart_department_name VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table with ML integration
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) DEFAULT 'each',
    brand VARCHAR(255) DEFAULT 'Generic',
    image_url VARCHAR(255),
    category_id UUID NOT NULL REFERENCES categories(id),
    stock INTEGER DEFAULT 100 CHECK (stock >= 0),
    is_active BOOLEAN DEFAULT true,
    
    -- CRITICAL: ML Integration columns
    instacart_product_id INTEGER UNIQUE,  -- Maps to Instacart product_id
    instacart_aisle_id INTEGER,           -- From aisles.csv
    instacart_department_id INTEGER,      -- From departments.csv
    instacart_aisle_name VARCHAR(255),    -- Cached from aisles.csv
    instacart_department_name VARCHAR(255), -- Cached from departments.csv
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table with ML integration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    -- CRITICAL: ML Integration
    instacart_user_id INTEGER UNIQUE,  -- Maps to Instacart user_id
    is_demo_user BOOLEAN DEFAULT false, -- Flag for admin-created demo users
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table with temporal fields for ML - CLEANED: No delivery dependencies
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- CRITICAL: ML Temporal fields (matching Instacart)
    order_sequence INTEGER,  -- User's order number (1st, 2nd, 3rd order)
    days_since_prior_order DECIMAL(10,2) DEFAULT 0,
    order_dow INTEGER CHECK (order_dow >= 0 AND order_dow <= 6), -- 0=Sunday
    order_hour_of_day INTEGER CHECK (order_hour_of_day >= 0 AND order_hour_of_day <= 23),
    
    instacart_order_id INTEGER, -- If populated from Instacart data
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items with ML fields
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    
    -- CRITICAL: ML fields from Instacart
    add_to_cart_order INTEGER DEFAULT 1,  -- Sequence item added to cart
    reordered BOOLEAN DEFAULT false,       -- User bought this product before
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned')),
    total DECIMAL(10,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
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
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

-- User preferences table (simplified)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Auto basket generation settings
    auto_basket_enabled BOOLEAN DEFAULT false,
    auto_basket_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (auto_basket_frequency IN ('daily', 'weekly', 'monthly')),
    auto_basket_day INTEGER CHECK (auto_basket_day >= 0 AND auto_basket_day <= 6), -- 0=Monday
    auto_basket_time TIME DEFAULT '09:00:00',
    
    -- Basic UI preferences
    email_notifications BOOLEAN DEFAULT true,
    dark_mode BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Predicted baskets table for ML
CREATE TABLE IF NOT EXISTS predicted_baskets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    algorithm VARCHAR(50) DEFAULT 'TIFU-KNN',

    total_items INTEGER DEFAULT 0,

    -- 'generated' - predicted basket has been generated for the user
    -- 'modified' - predicted basket has been modified by the user
    -- 'archived' - new basket should be generated for the user
    status VARCHAR(50) DEFAULT 'generated' CHECK (status IN ('generated', 'modified', 'archived' )),

    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

    metadata JSONB DEFAULT '{}',
);

-- Predicted basket items
CREATE TABLE IF NOT EXISTS predicted_basket_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predicted_basket_id UUID NOT NULL REFERENCES predicted_baskets(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    predicted_quantity INTEGER DEFAULT 1,
    confidence_score DECIMAL(5,4),
    rank_order INTEGER, -- Order of recommendation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product views for recommendation enhancement
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    view_duration INTEGER DEFAULT 0, -- seconds
    came_from VARCHAR(255), -- referrer page
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ML performance
CREATE INDEX IF NOT EXISTS idx_products_instacart_id ON products(instacart_product_id);
CREATE INDEX IF NOT EXISTS idx_users_instacart_id ON users(instacart_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_temporal ON orders(order_dow, order_hour_of_day);
CREATE INDEX IF NOT EXISTS idx_orders_sequence ON orders(user_id, order_sequence);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_reordered ON order_items(product_id, reordered);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_predicted_baskets_user ON predicted_baskets(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_product ON product_views(user_id, product_id);
