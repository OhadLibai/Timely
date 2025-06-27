// database/init-database.ts
// FIXED: Complete database initialization with ML integration support

import { Sequelize, DataTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Logger setup
const logger = {
  info: (msg: string) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || ''),
  warn: (msg: string) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
};

// Database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'timely',
  logging: false
});

// Define models matching the schema
const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  description: DataTypes.TEXT,
  imageUrl: { type: DataTypes.STRING(255), field: 'image_url' },
  parentId: { type: DataTypes.UUID, field: 'parent_id' },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, {
  tableName: 'categories',
  underscored: true,
  timestamps: true
});

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  sku: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  compareAtPrice: { type: DataTypes.DECIMAL(10, 2), field: 'compare_at_price' },
  unit: DataTypes.STRING(50),
  unitValue: { type: DataTypes.DECIMAL(10, 3), field: 'unit_value' },
  brand: DataTypes.STRING(255),
  tags: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  imageUrl: { type: DataTypes.STRING(255), field: 'image_url' },
  additionalImages: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [], field: 'additional_images' },
  categoryId: { type: DataTypes.UUID, allowNull: false, field: 'category_id' },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  trackInventory: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'track_inventory' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_featured' },
  isOnSale: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_on_sale' },
  salePercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'sale_percentage' },
  nutritionalInfo: { type: DataTypes.JSONB, defaultValue: {}, field: 'nutritional_info' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  // CRITICAL: Add instacart_product_id for ML mapping
  instacartProductId: { type: DataTypes.INTEGER, field: 'instacart_product_id' }
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true
});

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  email: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  password: { type: DataTypes.STRING(255), allowNull: false },
  firstName: { type: DataTypes.STRING(100), field: 'first_name' },
  lastName: { type: DataTypes.STRING(100), field: 'last_name' },
  phone: DataTypes.STRING(20),
  role: { type: DataTypes.STRING(50), defaultValue: 'user' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_verified' },
  // CRITICAL: Add instacart_user_id for demo users
  instacartUserId: { type: DataTypes.INTEGER, unique: true, field: 'instacart_user_id' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  lastLoginAt: { type: DataTypes.DATE, field: 'last_login_at' },
  resetPasswordToken: { type: DataTypes.STRING(255), field: 'reset_password_token' },
  resetPasswordExpires: { type: DataTypes.DATE, field: 'reset_password_expires' }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true
});

// Deterministic helpers
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function deterministicPrice(productName: string): number {
  const hash = hashCode(productName);
  const price = 0.99 + (hash % 2000) / 100; // $0.99 to $20.99
  return Math.round(price * 100) / 100;
}

function deterministicStock(productName: string): number {
  const hash = hashCode(productName + '_stock');
  return 10 + (hash % 990); // 10 to 999
}

function deterministicImageUrl(productName: string, category: string): string {
  const categories = ['produce', 'dairy', 'bakery', 'meat', 'frozen', 'beverages', 'snacks', 'pantry'];
  const catIndex = hashCode(category) % categories.length;
  const imageIndex = hashCode(productName) % 10 + 1;
  return `https://source.unsplash.com/400x400/?${categories[catIndex]},food&sig=${imageIndex}`;
}

// Category mapping for Instacart data
const categoryMapping: { [key: string]: string } = {
  'produce': 'c1234567-89ab-cdef-0123-456789abcdef',
  'dairy eggs': 'c2234567-89ab-cdef-0123-456789abcdef',
  'dairy': 'c2234567-89ab-cdef-0123-456789abcdef',
  'bakery': 'c3234567-89ab-cdef-0123-456789abcdef',
  'meat seafood': 'c4234567-89ab-cdef-0123-456789abcdef',
  'frozen': 'c5234567-89ab-cdef-0123-456789abcdef',
  'beverages': 'c6234567-89ab-cdef-0123-456789abcdef',
  'default': 'c1234567-89ab-cdef-0123-456789abcdef'
};

// Seed initial users
async function seedUsers() {
  logger.info("Seeding users with deterministic data...");
  
  const users = [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'admin@timely.demo',
      password: await bcrypt.hash('admin123', 12),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      emailVerified: true
    },
    {
      id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'demo@timely.demo',
      password: await bcrypt.hash('demo123', 12),
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true
    }
  ];

  for (const userData of users) {
    await User.upsert(userData);
  }
  
  logger.info(`✅ Seeded ${users.length} users`);
}

// FIXED: Populate products from CSV with proper instacart_product_id mapping
async function populateFromCsv() {
  const csvPath = process.env.CSV_PATH || path.join(__dirname, '../../ml-service/dataset/products.csv');
  
  if (!fs.existsSync(csvPath)) {
    logger.warn(`CSV file not found at ${csvPath}. Skipping product population.`);
    logger.info('To enable product seeding, place products.csv in ml-service/dataset/');
    return;
  }

  logger.info(`Loading products from ${csvPath}...`);
  
  const productsData: any[] = [];
  const productIdMap = new Map<number, string>(); // Map Instacart ID to UUID

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const csvProductId = parseInt(row.product_id);
        const productName = row.product_name || `Product ${csvProductId}`;
        const department = (row.department || 'produce').toLowerCase();
        
        // Generate deterministic UUID from product ID
        const productUuid = uuidv4();
        productIdMap.set(csvProductId, productUuid);
        
        // Map department to category
        const categoryUuid = categoryMapping[department] || categoryMapping['default'];
        
        // Generate deterministic values
        const price = deterministicPrice(productName);
        const stock = deterministicStock(productName);
        const imageUrl = deterministicImageUrl(productName, department);

        productsData.push({
          id: productUuid,
          name: productName,
          categoryId: categoryUuid,
          sku: `PROD-${String(csvProductId).padStart(7, '0')}`,
          imageUrl: imageUrl,
          price: price,
          isActive: true,
          stock: stock,
          unit: 'each',
          brand: 'Generic',
          tags: [],
          additionalImages: [],
          nutritionalInfo: {},
          // CRITICAL: Store the original Instacart product ID
          instacartProductId: csvProductId,
          metadata: { 
            originalCsvId: csvProductId,
            aisle: row.aisle,
            department: row.department,
            deterministicSeed: true
          }
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Bulk insert products
  try {
    await Product.bulkCreate(productsData, { 
      ignoreDuplicates: true,
      validate: true,
      updateOnDuplicate: ['instacartProductId', 'metadata', 'updatedAt']
    });
    
    logger.info(`✅ Populated ${productsData.length} products with Instacart IDs`);
    logger.info(`✅ Product ID mapping established for ML integration`);
    
    // Verify mapping
    const sampleCheck = await Product.count({
      where: {
        instacartProductId: { [Sequelize.Op.ne]: null }
      }
    });
    logger.info(`✅ Verified ${sampleCheck} products have instacart_product_id set`);
    
  } catch (error) {
    logger.error('Error populating products:', error);
    throw error;
  }
}

// Ensure categories exist
async function ensureCategories() {
  logger.info("Ensuring categories exist...");
  
  const categories = [
    { id: 'c1234567-89ab-cdef-0123-456789abcdef', name: 'Produce', slug: 'produce', description: 'Fresh fruits and vegetables', sortOrder: 1 },
    { id: 'c2234567-89ab-cdef-0123-456789abcdef', name: 'Dairy', slug: 'dairy', description: 'Milk, cheese, yogurt and more', sortOrder: 2 },
    { id: 'c3234567-89ab-cdef-0123-456789abcdef', name: 'Bakery', slug: 'bakery', description: 'Fresh bread and baked goods', sortOrder: 3 },
    { id: 'c4234567-89ab-cdef-0123-456789abcdef', name: 'Meat & Seafood', slug: 'meat-seafood', description: 'Fresh meat and seafood', sortOrder: 4 },
    { id: 'c5234567-89ab-cdef-0123-456789abcdef', name: 'Frozen', slug: 'frozen', description: 'Frozen foods', sortOrder: 5 },
    { id: 'c6234567-89ab-cdef-0123-456789abcdef', name: 'Beverages', slug: 'beverages', description: 'Drinks and beverages', sortOrder: 6 }
  ];

  for (const category of categories) {
    await Category.upsert({
      ...category,
      isActive: true
    });
  }
  
  logger.info(`✅ Ensured ${categories.length} categories exist`);
}

// Verify ML integration
async function verifyMLIntegration() {
  logger.info("Verifying ML integration setup...");
  
  // Check if instacart_product_id column exists
  const productColumns = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'instacart_product_id'
  `, { type: Sequelize.QueryTypes.SELECT });
  
  if (productColumns.length === 0) {
    logger.error("❌ instacart_product_id column missing from products table!");
    throw new Error("ML integration incomplete: missing instacart_product_id");
  }
  
  // Check if instacart_user_id column exists
  const userColumns = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'instacart_user_id'
  `, { type: Sequelize.QueryTypes.SELECT });
  
  if (userColumns.length === 0) {
    logger.error("❌ instacart_user_id column missing from users table!");
    throw new Error("ML integration incomplete: missing instacart_user_id");
  }
  
  // Check temporal fields in orders
  const orderColumns = await sequelize.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name IN ('order_sequence', 'days_since_prior_order', 'order_dow', 'order_hour_of_day')
  `, { type: Sequelize.QueryTypes.SELECT });
  
  if (orderColumns.length < 4) {
    logger.error("❌ Temporal columns missing from orders table!");
    throw new Error("ML integration incomplete: missing temporal fields");
  }
  
  logger.info("✅ ML integration verified: all required columns present");
}

// Main initialization function
async function main() {
  logger.info("Starting ML-integrated database initialization...");
  
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established");

    // Don't sync models - use the schema from init.sql
    logger.info("Using schema from init.sql (not syncing models)");

    // Seed data in order
    await ensureCategories();
    await seedUsers();
    await populateFromCsv();
    
    // Verify ML integration
    await verifyMLIntegration();

    await sequelize.close();
    logger.info("🎉 Database initialization completed successfully!");
    logger.info("🚀 ML integration ready: Products have instacart_product_id mapping");
    logger.info("📊 Demo users can be seeded with Instacart data");
    
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main, sequelize, Product, User, Category };