-- ============================================================================
-- CONSOLIDATED DATABASE APPROACH - Single Source of Truth
-- ============================================================================

-- SIMPLIFIED init.sql - Schema Only, No Data
-- database/init.sql (SIMPLIFIED VERSION)

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

-- Orders table with temporal fields for ML
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- CRITICAL: ML Temporal fields (matching Instacart)
    order_sequence INTEGER,  -- User's order number (1st, 2nd, 3rd order)
    days_since_prior_order DECIMAL(10,2) DEFAULT 0,
    order_dow INTEGER CHECK (order_dow >= 0 AND order_dow <= 6), -- 0=Monday
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
    
    -- CRITICAL: ML fields from Instacart
    add_to_cart_order INTEGER DEFAULT 1,  -- Sequence item added to cart
    reordered BOOLEAN DEFAULT false,       -- User bought this product before
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ML performance
CREATE INDEX IF NOT EXISTS idx_products_instacart_id ON products(instacart_product_id);
CREATE INDEX IF NOT EXISTS idx_users_instacart_id ON users(instacart_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_temporal ON orders(order_dow, order_hour_of_day);
CREATE INDEX IF NOT EXISTS idx_orders_sequence ON orders(user_id, order_sequence);