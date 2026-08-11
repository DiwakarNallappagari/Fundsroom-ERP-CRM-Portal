import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticateJWT, requireRoles, RequestWithUser } from '../middleware/auth';
import { validateBody } from './auth';

const router = Router();

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  sku: z.string().min(3, 'SKU must be at least 3 characters long').toUpperCase(),
  category: z.string().min(2, 'Category must be at least 2 characters long'),
  unitPrice: z.number().positive('Unit price must be positive'),
  currentStock: z.number().int().nonnegative('Current stock cannot be negative'),
  minStockAlert: z.number().int().nonnegative('Minimum stock alert quantity cannot be negative'),
  location: z.string().min(2, 'Location details are required'),
});

const stockAdjustmentSchema = z.object({
  quantityChanged: z.number().int().positive('Quantity must be a positive integer'),
  movementType: z.enum(['IN', 'OUT'], {
    errorMap: () => ({ message: 'Movement type must be IN or OUT' }),
  }),
  reason: z.string().min(3, 'Reason must be at least 3 characters long'),
});

// Apply JWT authentication to all product routes
router.use(authenticateJWT);

// GET /api/products (Search, Category filter, Low stock alert filter, Pagination)
router.get(
  '/',
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string;
      const category = req.query.category as string;
      const alert = req.query.alert as string; // 'true' to get only low stock items
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (category) {
        whereClause.category = { contains: category, mode: 'insensitive' };
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (alert === 'true') {
        // Find products where stock is <= minimum alert level
        // We can express this by making a direct comparison. In prisma:
        // currentStock <= minStockAlert
        // Since Prisma doesn't directly support column-to-column comparisons easily in where objects without raw SQL,
        // we can either use Prisma.where with raw sql, or pull and filter, or just use a raw select query.
        // Wait, to keep it type-safe and database-agnostic:
        // We can use Prisma's lte reference. Prisma 4.3+ supports:
        // currentStock: { lte: prisma.product.fields.minStockAlert }
        // Let's use Prisma's field references:
        whereClause.currentStock = {
          lte: prisma.product.fields.minStockAlert,
        };
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.product.count({ where: whereClause }),
      ]);

      res.status(200).json({
        success: true,
        data: products,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/products (Add product)
router.post(
  '/',
  requireRoles(['ADMIN', 'WAREHOUSE']),
  validateBody(productSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const productData = req.body;

    try {
      // Check SKU uniqueness
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku },
      });

      if (existingProduct) {
        return next(new AppError(`Product with SKU '${productData.sku}' already exists`, 400));
      }

      const newProduct = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: productData,
        });

        // Log initial stock movement if it's > 0
        if (product.currentStock > 0) {
          await tx.stockMovementLog.create({
            data: {
              productId: product.id,
              quantityChanged: product.currentStock,
              movementType: 'IN',
              reason: 'Initial Product Stock Ingestion',
              createdById: req.user!.id,
            },
          });
        }

        return product;
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: newProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/products/:id (Edit product)
router.put(
  '/:id',
  requireRoles(['ADMIN', 'WAREHOUSE']),
  validateBody(productSchema.partial()),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const productData = req.body;

    try {
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return next(new AppError('Product not found', 404));
      }

      if (productData.sku && productData.sku !== existingProduct.sku) {
        const skuExists = await prisma.product.findUnique({
          where: { sku: productData.sku },
        });
        if (skuExists) {
          return next(new AppError(`Product with SKU '${productData.sku}' already exists`, 400));
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: productData,
      });

      res.status(200).json({
        success: true,
        message: 'Product details updated successfully',
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/products/:id/stock (Adjust stock: IN or OUT)
router.post(
  '/:id/stock',
  requireRoles(['ADMIN', 'WAREHOUSE']),
  validateBody(stockAdjustmentSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { quantityChanged, movementType, reason } = req.body;

    try {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      // Check for negative stock if doing OUT movement
      if (movementType === 'OUT' && product.currentStock < quantityChanged) {
        return next(
          new AppError(
            `Insufficient stock. Available: ${product.currentStock}, Requested: ${quantityChanged}`,
            400
          )
        );
      }

      const netChange = movementType === 'IN' ? quantityChanged : -quantityChanged;

      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update Product stock
        const updatedProduct = await tx.product.update({
          where: { id },
          data: {
            currentStock: {
              increment: netChange,
            },
          },
        });

        // 2. Create Stock Movement Log
        await tx.stockMovementLog.create({
          data: {
            productId: id,
            quantityChanged,
            movementType,
            reason,
            createdById: req.user!.id,
          },
        });

        return updatedProduct;
      });

      res.status(200).json({
        success: true,
        message: `Stock updated successfully (Type: ${movementType}, Quantity: ${quantityChanged})`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/products/:id/movements (Get stock movement log for a product)
router.get(
  '/:id/movements',
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      const logs = await prisma.stockMovementLog.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
