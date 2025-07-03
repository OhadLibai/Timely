// init-db/init-database.ts
import { Client } from 'pg';

const client = new Client({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'timely_user',
  password: process.env.DB_PASSWORD || 'timely_password',
  database: process.env.DB_NAME || 'timely_db',
});

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected to database successfully');

    // Create tables using raw SQL
    console.log('Creating database tables...');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'delivery_driver')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        image_url TEXT,
        is_available BOOLEAN DEFAULT true,
        stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
        delivery_address JSONB NOT NULL,
        delivery_instructions TEXT,
        estimated_delivery_time TIMESTAMP WITH TIME ZONE,
        actual_delivery_time TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
        subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deliveries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed')),
        pickup_time TIMESTAMP WITH TIME ZONE,
        delivery_time TIMESTAMP WITH TIME ZONE,
        current_location JSONB,
        route JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better performance
    console.log('Creating database indexes...');
    
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);');

    // Insert sample data
    console.log('Inserting sample data...');

    // Sample categories
    await client.query(`
      INSERT INTO categories (name, description) VALUES
        ('Fast Food', 'Quick and delicious fast food options'),
        ('Pizza', 'Fresh pizzas with various toppings'),
        ('Asian Cuisine', 'Traditional and modern Asian dishes'),
        ('Desserts', 'Sweet treats and desserts'),
        ('Beverages', 'Drinks and beverages')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Sample admin user (password: admin123)
    await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
        ('admin@timely.com', '$2b$10$8qvJJKxQzJ5ZxGxJ5ZxGxexample', 'Admin', 'User', 'admin'),
        ('john.doe@example.com', '$2b$10$8qvJJKxQzJ5ZxGxJ5ZxGxexample', 'John', 'Doe', 'customer'),
        ('driver@timely.com', '$2b$10$8qvJJKxQzJ5ZxGxJ5ZxGxexample', 'Driver', 'One', 'delivery_driver')
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('Database initialization completed successfully!');

  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the initialization
initializeDatabase();
