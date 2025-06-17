// /database/init-database.ts

import { DataSource, DataSourceOptions } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import csv from 'csv-parser';
import { config } from 'dotenv';

// Load environment variables from the root .env file
config({ path: path.resolve(__dirname, '../../.env') });

// --- Manually define entities here ---
import { User } from '../../backend/src/models/user.model';
import { Category } from '../../backend/src/models/category.model';
import { Product } from '../../backend/src/models/product.model';

// --- Logger ---
const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
};

// --- Database Configuration ---
const dataSourceOptions: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST || 'db',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    synchronize: false,
    logging: false,
    entities: [path.join(__dirname, '../../backend/src/models/**/*.ts')],
    migrations: [path.join(__dirname, '../../backend/src/database/migrations/**/*.ts')],
    migrationsTableName: 'migrations',
};

const AppDataSource = new DataSource(dataSourceOptions);

// --- Main Initialization Logic ---

async function seedUsers() {
  logger.info("Seeding users...");
  const userRepository = AppDataSource.getRepository(User);
  const usersToCreate = [
    { email: 'admin@timely.com', password: 'password', role: 'ADMIN', firstName: 'Admin' },
    { email: 'test@timely.com', password: 'password', role: 'USER', firstName: 'Test' }
  ];

  for (const userData of usersToCreate) {
    const userExists = await userRepository.findOne({ where: { email: userData.email } });
    if (!userExists) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const user = userRepository.create({ ...userData, password: hashedPassword });
      await userRepository.save(user);
      logger.info(`✅ User '${userData.email}' seeded.`);
    }
  }
}

async function populateFromCsv() {
    logger.info("Populating categories and products from CSV...");
    const categoryRepository = AppDataSource.getRepository(Category);
    const productRepository = AppDataSource.getRepository(Product);

    // --- Step 1: Read category details from our new CSV ---
    const categoryDetailsMap = new Map<string, { description: string, imageUrl: string }>();
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'category_details.csv'))
            .pipe(csv())
            .on('data', (row) => {
                categoryDetailsMap.set(row.department_name, { description: row.description, imageUrl: row.imageUrl });
            })
            .on('end', () => {
                logger.info(`Loaded details for ${categoryDetailsMap.size} categories from CSV.`);
                resolve();
            })
            .on('error', reject);
    });
    
    // Default details for fallback
    const defaultDetails = { description: "A variety of quality products.", imageUrl: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" };

    // --- Step 2: Read departments.csv and create categories ---
    const departments: { id: number; name: string }[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream('/data/departments.csv')
            .pipe(csv())
            .on('data', (row) => {
                departments.push({ id: parseInt(row.department_id), name: row.department });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    for (const dept of departments) {
        const details = categoryDetailsMap.get(dept.name) || defaultDetails;
        const category = categoryRepository.create({
            id: dept.id,
            name: dept.name,
            description: details.description,
            imageUrl: details.imageUrl,
        });
        await categoryRepository.save(category);
    }
    logger.info(`✅ Populated ${departments.length} categories.`);
    
    // --- Step 3: Read and populate products ---
    const products: { id: number; name: string; categoryId: number }[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream('/data/products.csv')
            .pipe(csv())
            .on('data', (row) => {
                products.push({
                    id: parseInt(row.product_id),
                    name: row.product_name,
                    categoryId: parseInt(row.department_id),
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });

    await AppDataSource.createQueryBuilder()
        .insert()
        .into(Product)
        .values(products)
        .orIgnore()
        .execute();
    
    logger.info(`✅ Populated ${products.length} products.`);
}


async function main() {
  logger.info("Starting database initialization process...");
  try {
    await AppDataSource.initialize();
    logger.info("Database connection established.");

    await AppDataSource.runMigrations();
    logger.info("✅ Migrations executed successfully.");

    await seedUsers();
    await populateFromCsv();

    await AppDataSource.destroy();
    logger.info("🎉 Database initialization process completed successfully!");
  } catch (error) {
    logger.error("Database initialization failed:", error);
    process.exit(1);
  }
}

main();