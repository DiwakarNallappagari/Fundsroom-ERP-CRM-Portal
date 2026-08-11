import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticateJWT, requireRoles, RequestWithUser } from '../middleware/auth';
import { validateBody } from './auth';

const router = Router();

const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

const createChallanSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  status: z.enum(['DRAFT', 'CONFIRMED'], {
    errorMap: () => ({ message: 'Status must be DRAFT or CONFIRMED' }),
  }),
  items: z.array(challanItemSchema).min(1, 'At least one product must be added to the challan'),
});

const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED'], {
    errorMap: () => ({ message: 'Status must be CONFIRMED or CANCELLED' }),
  }),
});

// Generate a deterministic and unique Challan Number: CH-YYYYMMDD-XXXX
const getNextChallanNumber = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  const prefix = `CH-${dateString}-`;
  
  // Count how many challans have been created today
  const count = await prisma.salesChallan.count({
    where: {
      challanNumber: {
        startsWith: prefix,
      },
    },
  });

  const nextSeq = String(count + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

// Apply JWT Authentication
router.use(authenticateJWT);

// GET /api/challans (List challans with search and status filters)
router.get(
  '/',
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string;
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const whereClause: any = {};

      if (status) {
        whereClause.status = status.toUpperCase();
      }

      if (search) {
        whereClause.OR = [
          { challanNumber: { contains: search, mode: 'insensitive' } },
          {
            customer: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      const [challans, total] = await Promise.all([
        prisma.salesChallan.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { id: true, name: true, businessName: true },
            },
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        }),
        prisma.salesChallan.count({ where: whereClause }),
      ]);

      res.status(200).json({
        success: true,
        data: challans,
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

// GET /api/challans/:id (Get detail of a specific challan including snapshots)
router.get(
  '/:id',
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      const challan = await prisma.salesChallan.findUnique({
        where: { id },
        include: {
          customer: true,
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!challan) {
        return next(new AppError('Sales challan not found', 404));
      }

      res.status(200).json({
        success: true,
        data: challan,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/challans (Create a challan - DRAFT or CONFIRMED)
router.post(
  '/',
  requireRoles(['ADMIN', 'SALES']),
  validateBody(createChallanSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { customerId, status, items } = req.body;

    try {
      if (!req.user) return next(new AppError('Unauthorized', 401));

      // 1. Verify Customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }

      // 2. Fetch all products to validate stock and capture snapshot values
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (dbProducts.length !== productIds.length) {
        return next(new AppError('One or more products in the list are invalid', 400));
      }

      // Create a map of product details for easy lookup
      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // 3. Perform stock validations (if CONFIRMED)
      if (status === 'CONFIRMED') {
        for (const item of items) {
          const product = productMap.get(item.productId)!;
          if (product.currentStock < item.quantity) {
            return next(
              new AppError(
                `Insufficient stock for product '${product.name}' (SKU: ${product.sku}). Available: ${product.currentStock}, Required: ${item.quantity}`,
                400
              )
            );
          }
        }
      }

      // 4. Calculate figures and compile snapshotted items
      let totalQuantity = 0;
      let totalAmount = 0;
      const challanItemsData = items.map((item: any) => {
        const prod = productMap.get(item.productId)!;
        const amount = prod.unitPrice * item.quantity;
        totalQuantity += item.quantity;
        totalAmount += amount;

        return {
          productId: prod.id,
          productNameSnapshot: prod.name,
          productSkuSnapshot: prod.sku,
          unitPriceSnapshot: prod.unitPrice,
          quantity: item.quantity,
          amount,
        };
      });

      // 5. Run single transaction to save challan and alter stock
      const newChallan = await prisma.$transaction(async (tx) => {
        const challanNumber = await getNextChallanNumber();

        // A. Create the Challan and its snapshotted items
        const challan = await tx.salesChallan.create({
          data: {
            challanNumber,
            customerId,
            totalQuantity,
            totalAmount,
            status,
            createdById: req.user!.id,
            items: {
              create: challanItemsData,
            },
          },
          include: {
            items: true,
          },
        });

        // B. If status is CONFIRMED, execute stock deduction and log stock movement
        if (status === 'CONFIRMED') {
          for (const item of items) {
            const product = productMap.get(item.productId)!;
            
            // Deduct stock
            await tx.product.update({
              where: { id: item.productId },
              data: {
                currentStock: {
                  decrement: item.quantity,
                },
              },
            });

            // Log stock movement
            await tx.stockMovementLog.create({
              data: {
                productId: item.productId,
                quantityChanged: item.quantity,
                movementType: 'OUT',
                reason: `Sales Challan ${challanNumber} Confirmed`,
                createdById: req.user!.id,
              },
            });
          }
        }

        return challan;
      });

      res.status(201).json({
        success: true,
        message: `Sales Challan created successfully in ${status} status`,
        data: newChallan,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/challans/:id/status (Transition status: CONFIRMED or CANCELLED)
router.put(
  '/:id/status',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
  validateBody(updateStatusSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    try {
      if (!req.user) return next(new AppError('Unauthorized', 401));

      // Fetch the challan with items
      const challan = await prisma.salesChallan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        return next(new AppError('Sales challan not found', 404));
      }

      const currentStatus = challan.status;

      if (currentStatus === targetStatus) {
        return res.status(200).json({
          success: true,
          message: `Challan is already in ${targetStatus} status`,
          data: challan,
        });
      }

      if (currentStatus === 'CANCELLED') {
        return next(new AppError('Cannot modify status of a CANCELLED challan', 400));
      }

      const updatedChallan = await prisma.$transaction(async (tx) => {
        // --- CASE 1: DRAFT -> CONFIRMED (deduct stock, check availability) ---
        if (currentStatus === 'DRAFT' && targetStatus === 'CONFIRMED') {
          // Fetch current stock for validation
          const productIds = challan.items.map((item) => item.productId).filter((id): id is string => id !== null);
          const dbProducts = await tx.product.findMany({
            where: { id: { in: productIds } },
          });
          const productMap = new Map(dbProducts.map((p) => [p.id, p]));

          // Validation check
          for (const item of challan.items) {
            if (!item.productId) {
              return next(new AppError(`Challan contains a deleted product and cannot be confirmed`, 400));
            }
            const product = productMap.get(item.productId);
            if (!product || product.currentStock < item.quantity) {
              const productName = product ? product.name : item.productNameSnapshot;
              const available = product ? product.currentStock : 0;
              return next(
                new AppError(
                  `Insufficient stock for product '${productName}'. Available: ${available}, Required: ${item.quantity}`,
                  400
                )
              );
            }
          }

          // Deduct stock and log
          for (const item of challan.items) {
            await tx.product.update({
              where: { id: item.productId! },
              data: {
                currentStock: {
                  decrement: item.quantity,
                },
              },
            });

            await tx.stockMovementLog.create({
              data: {
                productId: item.productId!,
                quantityChanged: item.quantity,
                movementType: 'OUT',
                reason: `Sales Challan ${challan.challanNumber} Confirmed`,
                createdById: req.user!.id,
              },
            });
          }
        }

        // --- CASE 2: CONFIRMED -> CANCELLED (revert stock back to inventory) ---
        if (currentStatus === 'CONFIRMED' && targetStatus === 'CANCELLED') {
          for (const item of challan.items) {
            if (item.productId) {
              // Add stock back
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  currentStock: {
                    increment: item.quantity,
                  },
                },
              });

              // Log stock movement
              await tx.stockMovementLog.create({
                data: {
                  productId: item.productId,
                  quantityChanged: item.quantity,
                  movementType: 'IN',
                  reason: `Sales Challan ${challan.challanNumber} Cancelled (Inventory Reverted)`,
                  createdById: req.user!.id,
                },
              });
            }
          }
        }

        // --- CASE 3: DRAFT -> CANCELLED (no stock change needed) ---
        // Covered under default status update below

        // Update the challan status
        return tx.salesChallan.update({
          where: { id },
          data: { status: targetStatus },
          include: { items: true },
        });
      });

      res.status(200).json({
        success: true,
        message: `Challan status updated to ${targetStatus} successfully`,
        data: updatedChallan,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
