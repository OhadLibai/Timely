// backend/src/controllers/product.controller.ts
// SANITIZED: Removed file uploads and admin CRUD - READ-ONLY catalog controller

import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Product, Category, User, ProductView } from '../models';
import logger from '../utils/logger';

export class ProductController {

  // ============================================================================
  // READ-ONLY PRODUCT OPERATIONS (Core functionality)
  // ============================================================================

  // Get all products with filters
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 20,
        sort = 'createdAt',
        order = 'desc',
        search,
        categories,
        minPrice,
        maxPrice,
        inStock,
        onSale,
        featured
      } = req.query;

      const where: any = { isActive: true };
      const include = [{ model: Category, as: 'category' }];

      // Search filter
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Category filter
      if (categories) {
        const categoryIds = Array.isArray(categories) ? categories : [categories];
        where.categoryId = { [Op.in]: categoryIds };
      }

      // Price range filter
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) where.price[Op.gte] = parseFloat(minPrice as string);
        if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice as string);
      }

      // Stock filter
      if (inStock === 'true') {
        where.stock = { [Op.gt]: 0 };
      }

      // Sale filter
      if (onSale === 'true') {
        where.isOnSale = true;
      }

      // Featured filter
      if (featured === 'true') {
        where.isFeatured = true;
      }

      const offset = (Number(page) - 1) * Number(limit);
      const orderClause = [[sort as string, order as string]];

      const { count, rows: products } = await Product.findAndCountAll({
        where,
        include,
        limit: Number(limit),
        offset,
        order: orderClause,
        distinct: true
      });

      res.json({
        products,
        pagination: {
          total: count,
          page: Number(page),
          totalPages: Math.ceil(count / Number(limit)),
          limit: Number(limit)
        }
      });

    } catch (error) {
      logger.error('Error fetching products:', error);
      next(error);
    }
  }

  // Get single product
  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const product = await Product.findByPk(id, {
        include: [{ model: Category, as: 'category' }]
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Track product view if user is authenticated
      const userId = (req as any).user?.id;
      if (userId) {
        try {
          await ProductView.create({ userId, productId: id });
        } catch (error) {
          // Ignore view tracking errors
          logger.warn('Could not track product view:', error);
        }
      }

      res.json(product);

    } catch (error) {
      logger.error('Error fetching product:', error);
      next(error);
    }
  }

  // Get product recommendations
  async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = 4 } = req.query;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Simple recommendation: same category products
      const recommendations = await Product.findAll({
        where: {
          categoryId: product.categoryId,
          id: { [Op.ne]: id },
          isActive: true
        },
        include: [{ model: Category, as: 'category' }],
        limit: Number(limit),
        order: [['createdAt', 'DESC']]
      });

      res.json({ recommendations });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // READ-ONLY CATEGORY OPERATIONS
  // ============================================================================

  // Get categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.findAll({
        where: { isActive: true },
        order: [['name', 'ASC']]
      });

      res.json({ categories });
    } catch (error) {
      next(error);
    }
  }

  // Get category by ID
  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      const category = await Category.findByPk(id, {
        where: { isActive: true }
      });

      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // UTILITY OPERATIONS
  // ============================================================================

  // Get price range
  async getPriceRange(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await Product.findOne({
        attributes: [
          [Product.sequelize?.fn('MIN', Product.sequelize?.col('price')), 'minPrice'],
          [Product.sequelize?.fn('MAX', Product.sequelize?.col('price')), 'maxPrice']
        ],
        where: { isActive: true },
        raw: true
      });

      res.json({
        minPrice: result?.minPrice || 0,
        maxPrice: result?.maxPrice || 0
      });
    } catch (error) {
      next(error);
    }
  }

  // Track product view
  async trackView(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      if (userId) {
        await ProductView.create({ userId, productId: id });
      }

      res.json({ message: 'View tracked' });
    } catch (error) {
      // Don't fail request if view tracking fails
      logger.warn('Error tracking product view:', error);
      res.json({ message: 'View tracking skipped' });
    }
  }

  // ============================================================================
  // REMOVED METHODS (Admin CRUD operations):
  // - createProduct
  // - updateProduct  
  // - deleteProduct
  // - bulkUpdate
  // - importProducts
  // - exportProducts
  // - createCategory
  // - updateCategory
  // - deleteCategory
  //
  // Products and categories are now managed ONLY through database seeding.
  // This eliminates complexity and focuses the app on core ML demonstration.
  // ============================================================================
}