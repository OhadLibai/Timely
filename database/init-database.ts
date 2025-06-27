// database/init-database.ts
// CONSOLIDATED: Single source of truth for database population

import { Sequelize, DataTypes } from 'sequelize';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';

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
  username: process.env.POSTGRES_USER || 'timely_user',
  password: process.env.POSTGRES_PASSWORD || 'timely_password', 
  database: process.env.POSTGRES_DB || 'timely_db',
  logging: false
});

// Simplified models for data population
const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(255), allowNull: false },
  slug: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  description: DataTypes.TEXT,
  imageUrl: { type: DataTypes.STRING(255), field: 'image_url' },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  instacartDepartmentName: { type: DataTypes.STRING(255), field: 'instacart_department_name' }
}, { tableName: 'categories', underscored: true, timestamps: true });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  sku: { type: DataTypes.STRING(255), unique: true, allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING(50), defaultValue: 'each' },
  brand: { type: DataTypes.STRING(255), defaultValue: 'Generic' },
  imageUrl: { type: DataTypes.STRING(255), field: 'image_url' },
  categoryId: { type: DataTypes.UUID, allowNull: false, field: 'category_id' },
  stock: { type: DataTypes.INTEGER, defaultValue: 100 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  instacartProductId: { type: DataTypes.INTEGER, field: 'instacart_product_id' },
  instacartAisleId: { type: DataTypes.INTEGER, field: 'instacart_aisle_id' },
  instacartDepartmentId: { type: DataTypes.INTEGER, field: 'instacart_department_id' },
  instacartAisleName: { type: DataTypes.STRING(255), field: 'instacart_aisle_name' },
  instacartDepartmentName: { type: DataTypes.STRING(255), field: 'instacart_department_name' },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
}, { tableName: 'products', underscored: true, timestamps: true });

// ============================================================================
// SINGLE SOURCE OF TRUTH: CSV + category-details.csv
// ============================================================================

async function populateCategoriesFromCSV() {
  logger.info("📁 Populating categories from category-details.csv...");
  
  const csvPath = path.join(__dirname, 'category_details.csv');
  
  if (!fs.existsSync(csvPath)) {
    logger.warn("⚠️  category_details.csv not found, using default categories");
    await createDefaultCategories();
    return;
  }

  const categoryData: any[] = [];
  let sortOrder = 1;

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const departmentName = row.department_name?.trim();
        if (!departmentName) return;

        // Generate consistent UUID from department name
        const categoryId = generateDeterministicUUID(departmentName);
        
        // Create clean slug
        const slug = departmentName.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Clean name for display
        const displayName = departmentName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' & ');

        categoryData.push({
          id: categoryId,
          name: displayName,
          slug: slug,
          description: row.description || `${displayName} products`,
          imageUrl: row.imageUrl || null,
          sortOrder: sortOrder++,
          isActive: true,
          instacartDepartmentName: departmentName  // CRITICAL: Map to Instacart
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  try {
    await Category.bulkCreate(categoryData, { 
      ignoreDuplicates: true,
      updateOnDuplicate: ['description', 'imageUrl', 'updatedAt']
    });
    
    logger.info(`✅ Populated ${categoryData.length} categories from CSV`);
  } catch (error) {
    logger.error('❌ Failed to populate categories:', error);
    throw error;
  }
}

async function populateProductsFromInstacart() {
  logger.info("📦 Populating products from Instacart CSV files...");
  
  // Define paths (these should match your ml-service dataset paths)
  const datasetPath = '/app/dataset'; // This should be mounted from ml-service
  const productsPath = path.join(datasetPath, 'products.csv');
  const aislesPath = path.join(datasetPath, 'aisles.csv');
  const departmentsPath = path.join(datasetPath, 'departments.csv');
  
  // Check if files exist
  if (!fs.existsSync(productsPath)) {
    logger.warn(`⚠️  Products CSV not found at ${productsPath}`);
    logger.info("To populate products, mount ml-service/dataset to /app/dataset in database container");
    return;
  }

  // Load aisles and departments first
  const aisles = await loadCSVToMap(aislesPath, 'aisle_id', 'aisle');
  const departments = await loadCSVToMap(departmentsPath, 'department_id', 'department');
  
  // Load categories for mapping
  const categories = await Category.findAll();
  const categoryMap = new Map();
  categories.forEach((cat: any) => {
    if (cat.instacartDepartmentName) {
      categoryMap.set(cat.instacartDepartmentName, cat.id);
    }
  });
  
  logger.info(`📊 Loaded ${aisles.size} aisles, ${departments.size} departments, ${categoryMap.size} category mappings`);

  const productData: any[] = [];
  let processed = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream(productsPath)
      .pipe(csv())
      .on('data', (row) => {
        const productId = parseInt(row.product_id);
        const productName = row.product_name || `Product ${productId}`;
        const aisleId = parseInt(row.aisle_id);
        const departmentId = parseInt(row.department_id);
        
        const aisleName = aisles.get(aisleId) || 'Unknown';
        const departmentName = departments.get(departmentId) || 'produce';
        
        // Map to category
        const categoryId = categoryMap.get(departmentName) || categoryMap.get('produce');
        
        if (!categoryId) {
          logger.warn(`⚠️  No category mapping for department: ${departmentName}`);
          return;
        }

        const price = deterministicPrice(productName);
        const imageUrl = deterministicImageUrl(productName, departmentName);

        productData.push({
          id: uuidv4(),
          sku: `INST-${String(productId).padStart(7, '0')}`,
          name: productName,
          description: `${productName} from ${aisleName}`,
          price: price,
          unit: 'each',
          brand: 'Generic',
          imageUrl: imageUrl,
          categoryId: categoryId,
          stock: 100,
          isActive: true,
          instacartProductId: productId,
          instacartAisleId: aisleId,
          instacartDepartmentId: departmentId,
          instacartAisleName: aisleName,
          instacartDepartmentName: departmentName,
          metadata: { 
            sourceDataset: 'instacart',
            originalCsvId: productId
          }
        });

        processed++;
        if (processed % 5000 === 0) {
          logger.info(`📈 Processed ${processed} products...`);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  try {
    // Bulk insert in batches for better performance
    const batchSize = 1000;
    for (let i = 0; i < productData.length; i += batchSize) {
      const batch = productData.slice(i, i + batchSize);
      await Product.bulkCreate(batch, { 
        ignoreDuplicates: true,
        updateOnDuplicate: ['name', 'instacartAisleName', 'instacartDepartmentName', 'updatedAt']
      });
      logger.info(`📦 Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productData.length/batchSize)}`);
    }
    
    logger.info(`✅ Populated ${productData.length} products from Instacart CSV`);
  } catch (error) {
    logger.error('❌ Failed to populate products:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadCSVToMap(csvPath: string, keyCol: string, valueCol: string): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  
  if (!fs.existsSync(csvPath)) {
    logger.warn(`⚠️  CSV not found: ${csvPath}`);
    return map;
  }

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        const key = parseInt(row[keyCol]);
        const value = row[valueCol];
        if (!isNaN(key) && value) {
          map.set(key, value);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });

  return map;
}

function generateDeterministicUUID(input: string): string {
  // Simple deterministic UUID generation for consistent category IDs
  const hash = input.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `c${hex.slice(0, 7)}-89ab-cdef-0123-456789abcdef`;
}

function deterministicPrice(productName: string): number {
  const hash = productName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return Math.round((2 + (hash % 20)) * 100) / 100; // $2.00 - $22.00
}

function deterministicImageUrl(productName: string, department: string): string {
  const images = {
    'produce': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300',
    'dairy eggs': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300',
    'meat seafood': 'https://images.unsplash.com/photo-1448906654166-444d494666b3?w=300',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
    'frozen': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300',
    'default': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300'
  };
  
  return images[department] || images['default'];
}

async function createDefaultCategories() {
  const defaultCategories = [
    { name: 'Produce', slug: 'produce', description: 'Fresh fruits and vegetables', instacartDepartmentName: 'produce' },
    { name: 'Dairy & Eggs', slug: 'dairy-eggs', description: 'Milk, cheese, yogurt and eggs', instacartDepartmentName: 'dairy eggs' },
    { name: 'Meat & Seafood', slug: 'meat-seafood', description: 'Fresh meat and seafood', instacartDepartmentName: 'meat seafood' },
    { name: 'Bakery', slug: 'bakery', description: 'Fresh bread and baked goods', instacartDepartmentName: 'bakery' },
    { name: 'Frozen', slug: 'frozen', description: 'Frozen foods', instacartDepartmentName: 'frozen' },
    { name: 'Pantry', slug: 'pantry', description: 'Pantry staples', instacartDepartmentName: 'pantry' }
  ];

  for (let i = 0; i < defaultCategories.length; i++) {
    const cat = defaultCategories[i];
    await Category.upsert({
      id: generateDeterministicUUID(cat.instacartDepartmentName),
      ...cat,
      sortOrder: i + 1,
      isActive: true
    });
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  logger.info("🚀 Starting consolidated database initialization...");
  
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established");

    // Populate in correct order
    await populateCategoriesFromCSV();     // Categories first (from category_details.csv)
    await populateProductsFromInstacart(); // Products second (from Instacart CSVs)

    await sequelize.close();
    logger.info("🎉 Database initialization completed successfully!");
    logger.info("💡 Database now contains categories and products mapped to Instacart data");
    
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}