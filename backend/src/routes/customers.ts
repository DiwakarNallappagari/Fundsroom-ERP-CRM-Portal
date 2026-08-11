import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { AppError } from '../middleware/errorHandler';
import { authenticateJWT, requireRoles, RequestWithUser } from '../middleware/auth';
import { validateBody } from './auth';

const router = Router();

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters long'),
  gstNumber: z.string().optional().nullable(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'], {
    errorMap: () => ({ message: 'Customer type must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status must be LEAD, ACTIVE, or INACTIVE' }),
  }),
  followUpDate: z.string()
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : null)),
  notes: z.string().optional().nullable(),
});

const noteSchema = z.object({
  note: z.string().min(3, 'Note must be at least 3 characters long'),
});

// Apply JWT authentication to all customer CRM routes
router.use(authenticateJWT);

// GET /api/customers (Query, Search, Status filter, Pagination)
router.get(
  '/',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
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
          { name: { contains: search, mode: 'insensitive' } },
          { businessName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, role: true },
            },
          },
        }),
        prisma.customer.count({ where: whereClause }),
      ]);

      res.status(200).json({
        success: true,
        data: customers,
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

// POST /api/customers (Add customer)
router.post(
  '/',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
  validateBody(customerSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError('Unauthorized', 401));

      const customerData = req.body;

      const newCustomer = await prisma.$transaction(async (tx) => {
        // Create the customer
        const customer = await tx.customer.create({
          data: {
            ...customerData,
            createdById: req.user!.id,
          },
        });

        // Add initial system note if notes exist
        if (customerData.notes) {
          await tx.followUpNote.create({
            data: {
              customerId: customer.id,
              note: `Customer created. Initial note: "${customerData.notes}"`,
              createdById: req.user!.id,
            },
          });
        }

        return customer;
      });

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: newCustomer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/customers/:id (View customer details with history logs)
router.get(
  '/:id',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
          followUpNotes: {
            orderBy: { createdAt: 'desc' },
            include: {
              createdBy: {
                select: { id: true, name: true, role: true },
              },
            },
          },
        },
      });

      if (!customer) {
        return next(new AppError('Customer not found', 404));
      }

      res.status(200).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/customers/:id (Edit customer)
router.put(
  '/:id',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
  validateBody(customerSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const customerData = req.body;

    try {
      const customerExists = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customerExists) {
        return next(new AppError('Customer not found', 404));
      }

      const updatedCustomer = await prisma.$transaction(async (tx) => {
        const updated = await tx.customer.update({
          where: { id },
          data: customerData,
        });

        // Add a system note about updating customer details
        await tx.followUpNote.create({
          data: {
            customerId: id,
            note: 'Customer profile details updated.',
            createdById: req.user!.id,
          },
        });

        return updated;
      });

      res.status(200).json({
        success: true,
        message: 'Customer details updated successfully',
        data: updatedCustomer,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/customers/:id/notes (Add follow-up note)
router.post(
  '/:id/notes',
  requireRoles(['ADMIN', 'SALES', 'ACCOUNTS']),
  validateBody(noteSchema),
  async (req: RequestWithUser, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { note } = req.body;

    try {
      const customerExists = await prisma.customer.findUnique({
        where: { id },
      });

      if (!customerExists) {
        return next(new AppError('Customer not found', 404));
      }

      const newNote = await prisma.followUpNote.create({
        data: {
          customerId: id,
          note,
          createdById: req.user!.id,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, role: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Follow-up note added successfully',
        data: newNote,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
