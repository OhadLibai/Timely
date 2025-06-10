// timely/backend/src/database/database.seed.ts
import { sequelize } from '../config/database.config'; // Corrected import path
import { User, UserRole } from '../models/user.model';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { Cart } from '../models/cart.model';
import { UserPreference } from '../models/userPreference.model';
import logger from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser'; // Make sure you have `csv-parser` and `@types/node` in devDependencies

class DatabaseSeeder {
  private categories: Map<string, string> = new Map();
  
  async seed() {
    try {
      logger.info('Starting database seeding...');
      await this.createUsers();
      await this.createCategories();
      // createProducts is now handled by the ML service's train-model script
      // to populate staging tables, so we comment it out here to avoid conflicts.
      // await this.createProducts(); 
      logger.info('Database seeding completed successfully for users and categories.');
    } catch (error) {
      logger.error('Error seeding database:', error);
      throw error;
    }
  }
  
  private async createUsers() {
    logger.info('Creating users...');
    
    // Admin user
    const [admin, adminCreated] = await User.findOrCreate({
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
    
    if (adminCreated) {
      await Cart.create({ userId: admin.id });
      await UserPreference.create({
        userId: admin.id,
        autoBasketEnabled: false
      });
    }
    
    // Test users
    const testUsers = [
      { email: 'user@timely.com', password: 'user123', firstName: 'John', lastName: 'Doe', phone: '+1234567891' },
      { email: 'jane@timely.com', password: 'jane123', firstName: 'Jane', lastName: 'Smith', phone: '+1234567892' },
      { email: 'mike@timely.com', password: 'mike123', firstName: 'Mike', lastName: 'Johnson', phone: '+1234567893' }
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
          deliveryPreference: ['standard', 'express', 'scheduled'][Math.floor(Math.random() * 3)] as 'standard' | 'express' | 'scheduled'
        });
      }
    }
    
    logger.info('Users created successfully');
  }
  
  private async createCategories() {
    logger.info('Creating categories from default list...');
    
    const defaultCategories = [
      { name: 'Produce', description: 'Fresh fruits and vegetables', imageUrl: '/images/categories/produce.jpg' },
      { name: 'Dairy & Eggs', description: 'Milk, cheese, yogurt, and eggs', imageUrl: '/images/categories/dairy.jpg' },
      { name: 'Meat & Seafood', description: 'Fresh and frozen meats and seafood', imageUrl: '/images/categories/meat.jpg' },
      { name: 'Bakery', description: 'Fresh bread, pastries, and baked goods', imageUrl: '/images/categories/bakery.jpg' },
      { name: 'Frozen', description: 'Frozen foods and ice cream', imageUrl: '/images/categories/frozen.jpg' },
      { name: 'Pantry', description: 'Canned goods, pasta, and dry goods', imageUrl: '/images/categories/pantry.jpg' },
      { name: 'Beverages', description: 'Soft drinks, juices, and water', imageUrl: '/images/categories/beverages.jpg' },
      { name: 'Snacks', description: 'Chips, cookies, and candy', imageUrl: '/images/categories/snacks.jpg' },
      { name: 'Personal Care', description: 'Vitamins, medicine, and personal care', imageUrl: '/images/categories/health.jpg' },
      { name: 'Household', description: 'Cleaning supplies and paper products', imageUrl: '/images/categories/household.jpg' }
    ];
    
    for (const catData of defaultCategories) {
      const [category] = await Category.findOrCreate({
        where: { name: catData.name },
        defaults: catData
      });
      
      this.categories.set(catData.name.toLowerCase(), category.id);
    }
    
    logger.info(`Upserted ${this.categories.size} categories successfully`);
  }
}

const seeder = new DatabaseSeeder();

sequelize.authenticate()
  .then(() => {
    logger.info('Database connection established for seeder.');
    return seeder.seed();
  })
  .then(() => {
    logger.info('Seeding completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Seeding failed:', error);
    process.exit(1);
  });