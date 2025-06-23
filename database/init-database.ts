// database/init-database.ts
// FIXED: Deterministic seeding using hash-based generation instead of Math.random() (R-3)

import { Sequelize } from 'sequelize-typescript';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';
import * as fs from 'fs';
import csv from 'csv-parser';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from the root .env file
config({ path: path.resolve(__dirname, '../.env') });

// Import models from backend
import { User, UserRole } from '../backend/src/models/user.model';
import { Category } from '../backend/src/models/category.model';
import { Product } from '../backend/src/models/product.model';

// Logger
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
};

// FIXED: Deterministic helper functions to replace Math.random()
function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function deterministicPrice(productName: string): number {
  const hash = deterministicHash(productName);
  // Generate price between $1.00 and $21.00 based on product name hash
  return ((hash % 2000) / 100) + 1;
}

function deterministicStock(productName: string): number {
  const hash = deterministicHash(productName + '_stock');
  // Generate stock between 10 and 109 based on product name hash
  return (hash % 100) + 10;
}

function deterministicImageUrl(productName: string, departmentName: string): string {
  const hash = deterministicHash(productName + departmentName);
  
  // Deterministic image selection based on hash
  const imageOptions = [
    'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/65175/pexels-photo-65175.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1093038/pexels-photo-1093038.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg?auto=compress&cs=tinysrgb&w=400'
  ];
  
  return imageOptions[hash % imageOptions.length];
}

// Database Configuration - Using Sequelize
const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.DB_HOST || 'db'}:${process.env.DB_PORT || '5432'}/${process.env.POSTGRES_DB}`;

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  },
  models: [User, Category, Product]
});

// ID mapping to handle CSV INTEGER -> UUID conversion
const categoryIdMap = new Map<number, string>();
const productIdMap = new Map<number, string>();

// User seeding function - Updated for Sequelize
async function seedUsers() {
  logger.info("Seeding users...");
  
  const usersToCreate = [
    { 
      email: 'admin@timely.com', 
      password: 'password', 
      role: UserRole.ADMIN,
      firstName: 'Admin',
      lastName: 'User'
    },
    { 
      email: 'test@timely.com', 
      password: 'password', 
      role: UserRole.USER,
      firstName: 'Test',
      lastName: 'User'
    }
  ];

  for (const userData of usersToCreate) {
    const userExists = await User.findOne({ where: { email: userData.email } });
    if (!userExists) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      await User.create({ 
        ...userData, 
        password: hashedPassword,
        isActive: true,
        metadata: {}
      });
      logger.info(`✅ User '${userData.email}' seeded.`);
    } else {
      logger.info(`ℹ️ User '${userData.email}' already exists, skipping.`);
    }
  }
}

// Category and Product seeding function - FIXED with deterministic generation
async function populateFromCsv() {
    logger.info("Populating categories and products from CSV with deterministic data...");

    // Read category details from CSV
    const categoryDetailsMap = new Map<string, { description: string, imageUrl: string }>();
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'category_details.csv'))
            .pipe(csv())
            .on('data', (row) => {
                categoryDetailsMap.set(row.department_name, { 
                  description: row.description, 
                  imageUrl: row.imageUrl 
                });
            })
            .on('end', () => {
                logger.info(`Loaded details for ${categoryDetailsMap.size} categories from CSV.`);
                resolve();
            })
            .on('error', reject);
    });
    
    // Default details for fallback
    const defaultDetails = { 
      description: "A variety of quality products.", 
      imageUrl: "https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400" 
    };

    // Read and process departments.csv for categories
    const categoriesData: any[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'departments.csv'))
            .pipe(csv())
            .on('data', (row) => {
                const csvDepartmentId = parseInt(row.department_id);
                const categoryUuid = uuidv4();
                categoryIdMap.set(csvDepartmentId, categoryUuid);
                
                const details = categoryDetailsMap.get(row.department) || defaultDetails;
                
                categoriesData.push({
                    id: categoryUuid, // Use UUID instead of CSV integer
                    name: row.department,
                    slug: row.department.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and'),
                    description: details.description,
                    imageUrl: details.imageUrl,
                    sortOrder: csvDepartmentId,
                    isActive: true
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Insert categories using Sequelize bulkCreate
    await Category.bulkCreate(categoriesData, { 
      ignoreDuplicates: true,
      validate: true 
    });
    logger.info(`✅ Populated ${categoriesData.length} categories.`);

    // Read and process products.csv
    const productsData: any[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'products.csv'))
            .pipe(csv())
            .on('data', (row) => {
                const csvProductId = parseInt(row.product_id);
                const csvDepartmentId = parseInt(row.department_id);
                const productUuid = uuidv4();
                productIdMap.set(csvProductId, productUuid);
                
                const categoryUuid = categoryIdMap.get(csvDepartmentId);
                if (!categoryUuid) {
                    logger.error(`Category not found for department_id: ${csvDepartmentId}`);
                    return;
                }

                const productName = row.product_name;
                
                // FIXED: Use deterministic generation instead of Math.random()
                const price = Math.round(deterministicPrice(productName) * 100) / 100;
                const stock = deterministicStock(productName);
                const imageUrl = deterministicImageUrl(productName, row.department || 'general');

                productsData.push({
                    id: productUuid, // Use UUID instead of CSV integer
                    name: productName,
                    categoryId: categoryUuid, // Use mapped category UUID
                    sku: `PROD-${String(csvProductId).padStart(7, '0')}`, // Keep original ID in SKU for reference
                    imageUrl: imageUrl,
                    price: price, // Deterministic price based on product name
                    isActive: true,
                    stock: stock, // Deterministic stock based on product name
                    unit: 'each',
                    brand: 'Generic',
                    tags: [],
                    additionalImages: [],
                    nutritionalInfo: {},
                    metadata: { 
                      originalCsvId: csvProductId, // Store original CSV ID for reference
                      deterministicSeed: true     // Flag to indicate deterministic generation
                    }
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // Insert products using Sequelize bulkCreate
    await Product.bulkCreate(productsData, { 
      ignoreDuplicates: true,
      validate: true 
    });
    
    logger.info(`✅ Populated ${productsData.length} products with deterministic pricing and stock.`);
    logger.info(`✅ All data generation is now reproducible and consistent across runs.`);
}

// Main initialization function - Updated for Sequelize
async function main() {
  logger.info("Starting deterministic database initialization process...");
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established.");

    // Sync models with database (alternative to migrations for development)
    await sequelize.sync({ alter: false }); // Don't alter existing tables
    logger.info("✅ Database models synchronized.");

    // Seed users and products with deterministic data
    await seedUsers();
    await populateFromCsv();

    await sequelize.close();
    logger.info("🎉 Deterministic database initialization completed successfully!");
    logger.info("🔧 All future runs will generate identical data for consistent testing.");
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

main();