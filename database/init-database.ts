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
        fs.createReadStream('/training-data/departments.csv')
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
    const products: { id: number; name: string; categoryId: number; imageUrl: string; price: number; sku: string }[] = [];
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream('/training-data/products.csv')
            .pipe(csv())
            .on('data', (row) => {
                // Generate a consistent image URL based on product name for deterministic results
                const productName = row.product_name.toLowerCase();
                let imageUrl = '';
                
                // Assign images based on product categories and common food items
                if (productName.includes('banana')) imageUrl = 'https://images.pexels.com/photos/2316466/pexels-photo-2316466.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('apple')) imageUrl = 'https://images.pexels.com/photos/102104/pexels-photo-102104.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('milk')) imageUrl = 'https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('bread') || productName.includes('loaf')) imageUrl = 'https://images.pexels.com/photos/209403/pexels-photo-209403.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('egg')) imageUrl = 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('cheese')) imageUrl = 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('yogurt')) imageUrl = 'https://images.pexels.com/photos/4061662/pexels-photo-4061662.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('chicken')) imageUrl = 'https://images.pexels.com/photos/616401/pexels-photo-616401.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('beef') || productName.includes('steak')) imageUrl = 'https://images.pexels.com/photos/65175/pexels-photo-65175.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('salmon') || productName.includes('fish') || productName.includes('tuna')) imageUrl = 'https://images.pexels.com/photos/725992/pexels-photo-725992.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('tomato')) imageUrl = 'https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('lettuce') || productName.includes('salad') || productName.includes('greens')) imageUrl = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('carrot')) imageUrl = 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('potato')) imageUrl = 'https://images.pexels.com/photos/144248/potatoes-vegetables-erdfrucht-bio-144248.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('orange') || productName.includes('citrus')) imageUrl = 'https://images.pexels.com/photos/327098/pexels-photo-327098.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('pasta') || productName.includes('noodle') || productName.includes('spaghetti')) imageUrl = 'https://images.pexels.com/photos/1487511/pexels-photo-1487511.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('rice')) imageUrl = 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('cereal') || productName.includes('oats') || productName.includes('granola')) imageUrl = 'https://images.pexels.com/photos/103124/pexels-photo-103124.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('coffee') || productName.includes('espresso')) imageUrl = 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('tea')) imageUrl = 'https://images.pexels.com/photos/230477/pexels-photo-230477.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('water') || productName.includes('sparkling') || productName.includes('juice')) imageUrl = 'https://images.pexels.com/photos/416528/pexels-photo-416528.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('chocolate') || productName.includes('candy') || productName.includes('sweet')) imageUrl = 'https://images.pexels.com/photos/918327/pexels-photo-918327.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('cookie') || productName.includes('biscuit')) imageUrl = 'https://images.pexels.com/photos/890577/pexels-photo-890577.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('cake') || productName.includes('muffin')) imageUrl = 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('ice cream') || productName.includes('frozen')) imageUrl = 'https://images.pexels.com/photos/1352278/pexels-photo-1352278.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('pizza')) imageUrl = 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('soup') || productName.includes('broth')) imageUrl = 'https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('sauce') || productName.includes('dressing')) imageUrl = 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('oil') || productName.includes('vinegar')) imageUrl = 'https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('spice') || productName.includes('salt') || productName.includes('pepper')) imageUrl = 'https://images.pexels.com/photos/277253/pexels-photo-277253.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('nuts') || productName.includes('almond') || productName.includes('peanut')) imageUrl = 'https://images.pexels.com/photos/1295572/pexels-photo-1295572.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('berry') || productName.includes('strawberry') || productName.includes('blueberry')) imageUrl = 'https://images.pexels.com/photos/89778/strawberries-frisch-ripe-sweet-89778.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('soap') || productName.includes('shampoo') || productName.includes('body wash')) imageUrl = 'https://images.pexels.com/photos/3762875/pexels-photo-3762875.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('detergent') || productName.includes('clean') || productName.includes('dish')) imageUrl = 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('diaper') || productName.includes('baby')) imageUrl = 'https://images.pexels.com/photos/3995441/pexels-photo-3995441.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('pet') || productName.includes('dog') || productName.includes('cat')) imageUrl = 'https://images.pexels.com/photos/45201/kitty-cat-kitten-pet-45201.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('wine') || productName.includes('beer') || productName.includes('alcohol')) imageUrl = 'https://images.pexels.com/photos/978512/pexels-photo-978512.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('can') || productName.includes('canned')) imageUrl = 'https://images.pexels.com/photos/8851531/pexels-photo-8851531.jpeg?auto=compress&cs=tinysrgb&w=400';
                else if (productName.includes('snack') || productName.includes('chip') || productName.includes('cracker')) imageUrl = 'https://images.pexels.com/photos/20967/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400';
                else {
                    // Default to a generic grocery image
                    imageUrl = 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&w=400';
                }

                products.push({
                    id: parseInt(row.product_id),
                    name: row.product_name,
                    categoryId: parseInt(row.department_id),
                    imageUrl: imageUrl,
                    price: Math.round((Math.random() * 20 + 1) * 100) / 100, // Random price between $1-$21
                    sku: `PROD-${String(row.product_id).padStart(7, '0')}` // Generate SKU as expected by admin controller
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