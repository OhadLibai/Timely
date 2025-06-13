// backend/src/controllers/product.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductView } from '../models/productView.model';
import { OrderItem } from '../models/orderItem.model';
import { Favorite } from '../models/favorite.model';
import { uploadImage } from '../services/upload.service';
import { parseCSV, generateCSV } from '../utils/csv.utils';
import logger from '../utils/logger';

export class ProductController {
  // Get all products with filters
  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 24,
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

      // Build where clause
      const where: any = { isActive: true };

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { tags: { [Op.contains]: [search as string] } }
        ];
      }

      if (categories) {
        const categoryIds = Array.isArray(categories) ? categories : [categories];
        where.categoryId = { [Op.in]: categoryIds };
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price[Op.gte] = parseFloat(minPrice as string);
        if (maxPrice !== undefined) where.price[Op.lte] = parseFloat(maxPrice as string);
      }

      if (inStock === 'true') {
        where[Op.or] = [
          { trackInventory: false },
          { stock: { [Op.gt]: 0 } }
        ];
      }

      if (onSale === 'true') {
        where.isOnSale = true;
      }

      if (featured === 'true') {
        where.isFeatured = true;
      }

      // Calculate offset
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Query products
      const { rows: products, count: total } = await Product.findAndCountAll({
        where,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          }
        ],
        order: [[sort as string, order as string]],
        limit: parseInt(limit as string),
        offset,
        distinct: true
      });

      // Calculate pagination
      const totalPages = Math.ceil(total / parseInt(limit as string));
      const hasMore = parseInt(page as string) < totalPages;

      res.json({
        products,
        total,
        page: parseInt(page as string),
        totalPages,
        hasMore
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single product
  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'category'
          }
        ]
      });

      if (!product || !product.isActive) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
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

      // Get products from same category
      const categoryProducts = await Product.findAll({
        where: {
          categoryId: product.categoryId,
          id: { [Op.ne]: id },
          isActive: true
        },
        include: [{ model: Category, as: 'category' }],
        limit: parseInt(limit as string) * 2,
        order: [['purchaseCount', 'DESC']]
      });

      // Get products with similar tags
      let tagProducts: Product[] = [];
      if (product.tags.length > 0) {
        tagProducts = await Product.findAll({
          where: {
            tags: { [Op.overlap]: product.tags },
            id: { [Op.ne]: id },
            isActive: true
          },
          include: [{ model: Category, as: 'category' }],
          limit: parseInt(limit as string),
          order: [['purchaseCount', 'DESC']]
        });
      }

      // Combine and deduplicate
      const recommendationMap = new Map();
      [...categoryProducts, ...tagProducts].forEach(p => {
        if (!recommendationMap.has(p.id)) {
          recommendationMap.set(p.id, p);
        }
      });

      // Get top N
      const recommendations = Array.from(recommendationMap.values())
        .slice(0, parseInt(limit as string));

      res.json(recommendations);
    } catch (error) {
      next(error);
    }
  }

  // Get categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await Category.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'description', 'imageUrl', 'parentId'],
        order: [['name', 'ASC']]
      });

      // Add product count
      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.count({
            where: { categoryId: category.id, isActive: true }
          });
          return {
            ...category.toJSON(),
            productCount
          };
        })
      );

      res.json(categoriesWithCount);
    } catch (error) {
      next(error);
    }
  }

  // Get category by ID
  async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);
      if (!category || !category.isActive) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const productCount = await Product.count({
        where: { categoryId: id, isActive: true }
      });

      res.json({
        ...category.toJSON(),
        productCount
      });
    } catch (error) {
      next(error);
    }
  }

  // Get price range
  async getPriceRange(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await Product.findOne({
        attributes: [
          [Product.sequelize!.fn('MIN', Product.sequelize!.col('price')), 'min'],
          [Product.sequelize!.fn('MAX', Product.sequelize!.col('price')), 'max']
        ],
        where: { isActive: true }
      });

      res.json({
        min: result?.get('min') || 0,
        max: result?.get('max') || 1000
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

      // Increment view count
      await Product.increment('viewCount', { where: { id } });

      // Log view if user is authenticated
      if (userId) {
        await ProductView.create({
          userId,
          productId: id
        });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  // Create product (Admin)
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productData = req.body;
      const files = req.files as Express.Multer.File[];

      // Upload images if provided
      if (files && files.length > 0) {
        const imageUrls = await Promise.all(
          files.map(file => uploadImage(file))
        );
        productData.imageUrl = imageUrls[0];
        productData.additionalImages = imageUrls.slice(1);
      }

      const product = await Product.create(productData);

      logger.info(`Product created: ${product.id}`);

      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }

  // Update product (Admin)
  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const files = req.files as Express.Multer.File[];

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Upload new images if provided
      if (files && files.length > 0) {
        const imageUrls = await Promise.all(
          files.map(file => uploadImage(file))
        );
        
        if (!updates.keepExistingImages) {
          updates.imageUrl = imageUrls[0];
          updates.additionalImages = imageUrls.slice(1);
        } else {
          updates.additionalImages = [
            ...(product.additionalImages || []),
            ...imageUrls
          ];
        }
      }

      await product.update(updates);

      logger.info(`Product updated: ${id}`);

      res.json(product);
    } catch (error) {
      next(error);
    }
  }

  // Delete product (Admin)
  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Soft delete by setting isActive to false
      await product.update({ isActive: false });

      logger.info(`Product deleted: ${id}`);

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Bulk update products (Admin)
  async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;
      
      let updated = 0;
      const errors: string[] = [];

      for (const { id, updates: productUpdates } of updates) {
        try {
          const product = await Product.findByPk(id);
          if (product) {
            await product.update(productUpdates);
            updated++;
          } else {
            errors.push(`Product ${id} not found`);
          }
        } catch (error: any) {
          errors.push(`Error updating product ${id}: ${error.message}`);
        }
      }

      res.json({ updated, errors });
    } catch (error) {
      next(error);
    }
  }

  // Import products (Admin)
  async importProducts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const products = await parseCSV(req.file.path);
      
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const productData of products) {
        try {
          // Check if SKU already exists
          const existing = await Product.findOne({
            where: { sku: productData.sku }
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Find category
          const category = await Category.findOne({
            where: { name: productData.category }
          });

          if (!category) {
            errors.push(`Category not found for product ${productData.sku}`);
            continue;
          }

          await Product.create({
            ...productData,
            categoryId: category.id,
            tags: productData.tags ? productData.tags.split(',').map((t: string) => t.trim()) : []
          });

          imported++;
        } catch (error: any) {
          errors.push(`Error importing product ${productData.sku}: ${error.message}`);
        }
      }

      res.json({ imported, skipped, errors });
    } catch (error) {
      next(error);
    }
  }

  // Export products (Admin)
  async exportProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await Product.findAll({
        include: [{ model: Category, as: 'category' }],
        order: [['createdAt', 'DESC']]
      });

      const data = products.map(product => ({
        sku: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        category: product.category?.name,
        brand: product.brand,
        tags: product.tags.join(','),
        stock: product.stock,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        isOnSale: product.isOnSale,
        salePercentage: product.salePercentage
      }));

      const csv = await generateCSV(data, Object.keys(data[0] || {}));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  // Create category (Admin)
  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryData = req.body;
      
      if (req.file) {
        categoryData.imageUrl = await uploadImage(req.file);
      }

      const category = await Category.create(categoryData);

      logger.info(`Category created: ${category.id}`);

      res.status(201).json(category);
    } catch (error) {
      next(error);
    }
  }

  // Update category (Admin)
  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      if (req.file) {
        updates.imageUrl = await uploadImage(req.file);
      }

      await category.update(updates);

      logger.info(`Category updated: ${id}`);

      res.json(category);
    } catch (error) {
      next(error);
    }
  }

  // Delete category (Admin)
  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category has products
      const productCount = await Product.count({ where: { categoryId: id } });
      if (productCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category with products. Please reassign or delete products first.' 
        });
      }

      await category.update({ isActive: false });

      logger.info(`Category deleted: ${id}`);

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}