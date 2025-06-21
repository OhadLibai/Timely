// database/init-database.ts
// UPDATED: Using Sequelize instead of TypeORM, handling UUID/INTEGER conflicts

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

// Category and Product seeding function - Updated for Sequelize with UUID handling
async function populateFromCsv() {
    logger.info("Populating categories and products from CSV...");

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

    // Read and process categories - Generate UUIDs for INTEGER IDs
    const categoriesData: any[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '../ml-service/training-data/departments.csv'))
            .pipe(csv())
            .on('data', (row) => {
                const csvId = parseInt(row.department_id);
                const uuid = uuidv4();
                categoryIdMap.set(csvId, uuid); // Map CSV ID to UUID
                
                const details = categoryDetailsMap.get(row.department) || defaultDetails;
                categoriesData.push({
                    id: uuid, // Use UUID instead of CSV integer
                    name: row.department,
                    description: details.description,
                    imageUrl: details.imageUrl,
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

    // Read and process products - Map category IDs to UUIDs
    const productsData: any[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '../ml-service/training-data/products.csv'))
            .pipe(csv())
            .on('data', (row) => {
                const csvProductId = parseInt(row.product_id);
                const csvCategoryId = parseInt(row.department_id);
                const productUuid = uuidv4();
                const categoryUuid = categoryIdMap.get(csvCategoryId);
                
                if (!categoryUuid) {
                    logger.error(`Category UUID not found for CSV ID: ${csvCategoryId}`);
                    return;
                }
                
                productIdMap.set(csvProductId, productUuid);
                
                const productName = row.product_name.toLowerCase();
                let imageUrl: string;

                // Smart image assignment based on product names
                if (productName.includes('organic') || productName.includes('fresh')) 
                    imageUrl = 'https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('milk') || productName.includes('yogurt') || productName.includes('cheese')) 
                    imageUrl = 'https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('bread') || productName.includes('bakery')) 
                    imageUrl = 'https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('fruit') || productName.includes('apple') || productName.includes('banana') || productName.includes('orange')) 
                    imageUrl = 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('vegetable') || productName.includes('carrot') || productName.includes('lettuce') || productName.includes('tomato')) 
                    imageUrl = 'https://images.pexels.com/photos/3995441/pexels-photo-3995441.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('meat') || productName.includes('chicken') || productName.includes('beef')) 
                    imageUrl = 'https://images.pexels.com/photos/65175/pexels-photo-65175.jpeg?auto=compress&cs=tinysrgb&w=400';
                else 
                    imageUrl = 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400';

                productsData.push({
                    id: productUuid, // Use UUID instead of CSV integer
                    name: row.product_name,
                    categoryId: categoryUuid, // Use mapped category UUID
                    sku: `PROD-${String(csvProductId).padStart(7, '0')}`, // Keep original ID in SKU for reference
                    imageUrl: imageUrl,
                    price: Math.round((Math.random() * 20 + 1) * 100) / 100, // Random price between $1-$21
                    isActive: true,
                    stock: Math.floor(Math.random() * 100) + 10, // Random stock 10-110
                    unit: 'each',
                    brand: 'Generic',
                    tags: [],
                    additionalImages: [],
                    nutritionalInfo: {},
                    metadata: { originalCsvId: csvProductId } // Store original CSV ID for reference
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
    
    logger.info(`✅ Populated ${productsData.length} products.`);
}

// Main initialization function - Updated for Sequelize
async function main() {
  logger.info("Starting database initialization process...");
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established.");

    // Sync models with database (alternative to migrations for development)
    await sequelize.sync({ alter: false }); // Don't alter existing tables
    logger.info("✅ Database models synchronized.");

    // Seed users and products
    await seedUsers();
    await populateFromCsv();

    await sequelize.close();
    logger.info("🎉 Database initialization process completed successfully!");
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

main();