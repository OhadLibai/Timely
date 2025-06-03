// backend/src/database/seed.ts
import { sequelize } from '../config/database';
import { User, UserRole } from '../models/user.model';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { Cart } from '../models/cart.model';
import { UserPreference } from '../models/userPreference.model';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';

interface InstacartProduct {
  product_id: string;
  product_name: string;
  aisle_id: string;
  department_id: string;
  aisle: string;
  department: string;
}

class DatabaseSeeder {
  private categories: Map<string, string> = new Map();
  
  async seed() {
    try {
      logger.info('Starting database seeding...');
      
      // Create default users
      await this.createUsers();
      
      // Create categories from Instacart data
      await this.createCategories();
      
      // Create products from Instacart data
      await this.createProducts();
      
      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Error seeding database:', error);
      throw error;
    }
  }
  
  private async createUsers() {
    logger.info('Creating users...');
    
    // Admin user
    const admin = await User.findOrCreate({
      where: { email: 'admin@timely.com' },
      defaults: {
        email: 'admin@timely.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        phone: '+1234567890'
      }
    });
    
    if (admin[1]) {
      await Cart.create({ userId: admin[0].id });
      await UserPreference.create({
        userId: admin[0].id,
        autoBasketEnabled: false
      });
    }
    
    // Test users
    const testUsers = [
      {
        email: 'user@timely.com',
        password: 'user123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567891'
      },
      {
        email: 'jane@timely.com',
        password: 'jane123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567892'
      },
      {
        email: 'mike@timely.com',
        password: 'mike123',
        firstName: 'Mike',
        lastName: 'Johnson',
        phone: '+1234567893'
      }
    ];
    
    for (const userData of testUsers) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData
      });
      
      if (created) {
        await Cart.create({ userId: user.id });
        await UserPreference.create({
          userId: user.id,
          autoBasketEnabled: true,
          autoBasketDay: Math.floor(Math.random() * 7),
          deliveryPreference: ['standard', 'express', 'scheduled'][Math.floor(Math.random() * 3)]
        });
      }
    }
    
    logger.info('Users created successfully');
  }
  
  private async createCategories() {
    logger.info('Creating categories...');
    
    // First, create from predefined list if no Instacart data
    const defaultCategories = [
      { name: 'Produce', description: 'Fresh fruits and vegetables', imageUrl: '/images/categories/produce.jpg' },
      { name: 'Dairy & Eggs', description: 'Milk, cheese, yogurt, and eggs', imageUrl: '/images/categories/dairy.jpg' },
      { name: 'Meat & Seafood', description: 'Fresh and frozen meats and seafood', imageUrl: '/images/categories/meat.jpg' },
      { name: 'Bakery', description: 'Fresh bread, pastries, and baked goods', imageUrl: '/images/categories/bakery.jpg' },
      { name: 'Frozen', description: 'Frozen foods and ice cream', imageUrl: '/images/categories/frozen.jpg' },
      { name: 'Pantry', description: 'Canned goods, pasta, and dry goods', imageUrl: '/images/categories/pantry.jpg' },
      { name: 'Beverages', description: 'Soft drinks, juices, and water', imageUrl: '/images/categories/beverages.jpg' },
      { name: 'Snacks', description: 'Chips, cookies, and candy', imageUrl: '/images/categories/snacks.jpg' },
      { name: 'Health & Personal Care', description: 'Vitamins, medicine, and personal care', imageUrl: '/images/categories/health.jpg' },
      { name: 'Household', description: 'Cleaning supplies and paper products', imageUrl: '/images/categories/household.jpg' }
    ];
    
    for (const catData of defaultCategories) {
      const [category, created] = await Category.findOrCreate({
        where: { name: catData.name },
        defaults: catData
      });
      
      this.categories.set(catData.name.toLowerCase(), category.id);
    }
    
    logger.info(`Created ${this.categories.size} categories`);
  }
  
  private async createProducts() {
    logger.info('Creating products...');
    
    // Try to load from Instacart CSV if available
    const csvPath = path.join(__dirname, '../../../ml-service/data/products.csv');
    
    if (fs.existsSync(csvPath)) {
      await this.loadInstacartProducts(csvPath);
    } else {
      await this.createSampleProducts();
    }
  }
  
  private async loadInstacartProducts(csvPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const products: any[] = [];
      let count = 0;
      const maxProducts = 5000; // Limit for initial load
      
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row: any) => {
          if (count < maxProducts) {
            products.push(row);
            count++;
          }
        })
        .on('end', async () => {
          logger.info(`Loading ${products.length} products from Instacart data...`);
          
          // Batch insert for performance
          const batchSize = 100;
          for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            const productData = batch.map(p => ({
              sku: `PROD-${p.product_id.padStart(6, '0')}`,
              name: p.product_name,
              description: `${p.product_name} from ${p.aisle || 'General'}`,
              price: this.generatePrice(p.department),
              compareAtPrice: Math.random() > 0.7 ? this.generatePrice(p.department) * 1.2 : null,
              unit: this.getUnit(p.aisle),
              brand: this.generateBrand(p.product_name),
              tags: [p.aisle, p.department].filter(Boolean),
              imageUrl: `/images/products/${p.department?.toLowerCase().replace(/\s+/g, '-')}.jpg`,
              categoryId: this.getCategoryId(p.department),
              stock: Math.floor(Math.random() * 500) + 50,
              trackInventory: true,
              isActive: true,
              isFeatured: Math.random() > 0.9,
              isOnSale: Math.random() > 0.8,
              salePercentage: Math.random() > 0.8 ? Math.floor(Math.random() * 30) + 10 : 0,
              nutritionalInfo: this.generateNutritionalInfo(p.department),
              metadata: {
                instacart_id: p.product_id,
                aisle: p.aisle,
                department: p.department
              }
            }));
            
            await Product.bulkCreate(productData, { ignoreDuplicates: true });
            
            if (i % 1000 === 0) {
              logger.info(`Loaded ${i} products...`);
            }
          }
          
          logger.info(`Successfully loaded ${products.length} products`);
          resolve();
        })
        .on('error', reject);
    });
  }
  
  private async createSampleProducts() {
    logger.info('Creating sample products...');
    
    const sampleProducts = [
      // Produce
      { name: 'Organic Bananas', category: 'produce', price: 0.69, unit: 'lb' },
      { name: 'Red Apples', category: 'produce', price: 1.99, unit: 'lb' },
      { name: 'Baby Spinach', category: 'produce', price: 3.99, unit: 'bag' },
      { name: 'Carrots', category: 'produce', price: 1.49, unit: 'lb' },
      { name: 'Tomatoes', category: 'produce', price: 2.99, unit: 'lb' },
      
      // Dairy
      { name: 'Whole Milk', category: 'dairy & eggs', price: 3.99, unit: 'gallon' },
      { name: 'Greek Yogurt', category: 'dairy & eggs', price: 4.99, unit: 'container' },
      { name: 'Cheddar Cheese', category: 'dairy & eggs', price: 5.99, unit: 'lb' },
      { name: 'Eggs (Dozen)', category: 'dairy & eggs', price: 3.49, unit: 'dozen' },
      
      // Meat
      { name: 'Chicken Breast', category: 'meat & seafood', price: 7.99, unit: 'lb' },
      { name: 'Ground Beef', category: 'meat & seafood', price: 5.99, unit: 'lb' },
      { name: 'Salmon Fillet', category: 'meat & seafood', price: 12.99, unit: 'lb' },
      
      // Bakery
      { name: 'Whole Wheat Bread', category: 'bakery', price: 2.99, unit: 'loaf' },
      { name: 'Bagels', category: 'bakery', price: 3.99, unit: 'pack' },
      { name: 'Croissants', category: 'bakery', price: 4.99, unit: 'pack' },
      
      // Pantry
      { name: 'Pasta', category: 'pantry', price: 1.99, unit: 'box' },
      { name: 'Rice', category: 'pantry', price: 4.99, unit: 'bag' },
      { name: 'Olive Oil', category: 'pantry', price: 8.99, unit: 'bottle' },
      { name: 'Peanut Butter', category: 'pantry', price: 4.99, unit: 'jar' },
      
      // Beverages
      { name: 'Orange Juice', category: 'beverages', price: 3.99, unit: 'bottle' },
      { name: 'Coffee', category: 'beverages', price: 9.99, unit: 'bag' },
      { name: 'Green Tea', category: 'beverages', price: 5.99, unit: 'box' },
      
      // Snacks
      { name: 'Potato Chips', category: 'snacks', price: 3.49, unit: 'bag' },
      { name: 'Dark Chocolate', category: 'snacks', price: 4.99, unit: 'bar' },
      { name: 'Mixed Nuts', category: 'snacks', price: 7.99, unit: 'container' }
    ];
    
    for (let i = 0; i < sampleProducts.length; i++) {
      const product = sampleProducts[i];
      const categoryId = this.categories.get(product.category) || this.categories.values().next().value;
      
      await Product.create({
        sku: `PROD-${(i + 1).toString().padStart(6, '0')}`,
        name: product.name,
        description: `Fresh and high-quality ${product.name}`,
        price: product.price,
        compareAtPrice: Math.random() > 0.7 ? product.price * 1.2 : null,
        unit: product.unit,
        brand: this.generateBrand(product.name),
        tags: [product.category, 'fresh', 'quality'],
        imageUrl: `/images/products/default.jpg`,
        categoryId,
        stock: Math.floor(Math.random() * 500) + 50,
        trackInventory: true,
        isActive: true,
        isFeatured: Math.random() > 0.8,
        isOnSale: Math.random() > 0.7,
        salePercentage: Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 10 : 0,
        nutritionalInfo: this.generateNutritionalInfo(product.category)
      });
    }
    
    logger.info(`Created ${sampleProducts.length} sample products`);
  }
  
  private generatePrice(department: string): number {
    const priceRanges: Record<string, [number, number]> = {
      'produce': [0.99, 5.99],
      'dairy eggs': [1.99, 7.99],
      'meat seafood': [3.99, 19.99],
      'bakery': [1.99, 6.99],
      'frozen': [2.99, 9.99],
      'pantry': [0.99, 12.99],
      'beverages': [1.99, 8.99],
      'snacks': [1.99, 6.99],
      'household': [2.99, 15.99],
      'personal care': [3.99, 19.99]
    };
    
    const key = department?.toLowerCase() || 'pantry';
    const range = priceRanges[key] || [1.99, 9.99];
    
    return Number((Math.random() * (range[1] - range[0]) + range[0]).toFixed(2));
  }
  
  private getUnit(aisle: string): string {
    const units: Record<string, string> = {
      'fresh fruits': 'lb',
      'fresh vegetables': 'lb',
      'packaged vegetables fruits': 'bag',
      'milk': 'gallon',
      'yogurt': 'container',
      'meat counter': 'lb',
      'packaged meat': 'pack',
      'bread': 'loaf',
      'cereal': 'box'
    };
    
    return units[aisle?.toLowerCase()] || 'unit';
  }
  
  private generateBrand(productName: string): string {
    const brands = [
      'Organic Valley', 'Nature\'s Best', 'Fresh Farm', 'Green Garden',
      'Happy Harvest', 'Pure Life', 'Wholesome', 'Natural Choice',
      'Farm Fresh', 'Simply Good'
    ];
    
    return brands[Math.floor(Math.random() * brands.length)];
  }
  
  private getCategoryId(department: string): string {
    const categoryMap: Record<string, string> = {
      'produce': 'produce',
      'dairy eggs': 'dairy & eggs',
      'meat seafood': 'meat & seafood',
      'bakery': 'bakery',
      'frozen': 'frozen',
      'pantry': 'pantry',
      'beverages': 'beverages',
      'snacks': 'snacks',
      'household': 'household',
      'personal care': 'health & personal care'
    };
    
    const categoryName = categoryMap[department?.toLowerCase()] || 'pantry';
    return this.categories.get(categoryName) || this.categories.values().next().value;
  }
  
  private generateNutritionalInfo(category: string): any {
    if (!['produce', 'dairy & eggs', 'meat & seafood', 'bakery', 'snacks'].includes(category)) {
      return {};
    }
    
    return {
      calories: Math.floor(Math.random() * 300) + 50,
      protein: Math.floor(Math.random() * 30) + 1,
      carbs: Math.floor(Math.random() * 50) + 5,
      fat: Math.floor(Math.random() * 20) + 1,
      fiber: Math.floor(Math.random() * 10),
      sugar: Math.floor(Math.random() * 30),
      sodium: Math.floor(Math.random() * 500) + 50
    };
  }
}

// Run seeder
const seeder = new DatabaseSeeder();

seeder.seed()
  .then(() => {
    logger.info('Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  });