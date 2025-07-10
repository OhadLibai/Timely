-- database/init.sql
-- Updated schema using Instacart IDs as primary keys

-- Categories table (using department_id from Instacart)
CREATE TABLE IF NOT EXISTS categories (
    department_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table (using instacart_product_id as primary key)
CREATE TABLE IF NOT EXISTS products (
    instacart_product_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    unit VARCHAR(50) DEFAULT 'each',
    brand VARCHAR(255) DEFAULT 'Generic',
    image_url VARCHAR(255),
    department_id INTEGER NOT NULL REFERENCES categories(department_id),
    aisle_id INTEGER,
    aisle_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table (using instacart_user_id as primary key)
CREATE TABLE IF NOT EXISTS users (
    instacart_user_id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    is_demo_user BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable UUID extension for orders and carts
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Orders table (UUID primary key, references user by instacart_user_id)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(instacart_user_id) ON DELETE CASCADE,
    order_number VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    
    -- ML temporal fields
    order_sequence INTEGER,
    days_since_prior_order DECIMAL(10,2) DEFAULT 0,
    order_dow INTEGER CHECK (order_dow >= 0 AND order_dow <= 6),
    order_hour_of_day INTEGER CHECK (order_hour_of_day >= 0 AND order_hour_of_day <= 23),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items (references products by instacart_product_id)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(instacart_product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    
    -- ML fields
    add_to_cart_order INTEGER DEFAULT 1,
    reordered BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carts table (UUID primary key)
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(instacart_user_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'converted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart items
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(instacart_product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id)
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(instacart_user_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(instacart_product_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- Predicted baskets table (for storing ML predictions)
CREATE TABLE IF NOT EXISTS predicted_baskets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES users(instacart_user_id) ON DELETE CASCADE,
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB
);

-- Predicted basket items
CREATE TABLE IF NOT EXISTS predicted_basket_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    basket_id UUID NOT NULL REFERENCES predicted_baskets(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(instacart_product_id),
    quantity INTEGER DEFAULT 1,
    confidence_score DECIMAL(3,2)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_dept ON products(department_id);
CREATE INDEX IF NOT EXISTS idx_products_aisle ON products(aisle_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_predicted_baskets_user ON predicted_baskets(user_id, is_active);

-- Insert default users with negative IDs
INSERT INTO users (instacart_user_id, email, password, first_name, last_name, role, is_active, email_verified)
VALUES 
    (-1, 'admin@timely.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiGH1CUhGJ.y', 'Admin', 'User', 'admin', true, true),
    (-2, 'user@timely.com', '$2b$12$5KiR0C9XI73iKNowe7L.ZuBhfxMKw5fMfyiAJFZz1c/NetDm.gQfO', 'Regular', 'User', 'customer', true, true)
ON CONFLICT (instacart_user_id) DO NOTHING;

-- Note: Passwords are hashed versions of 'admin_123' and 'user_123' respectively