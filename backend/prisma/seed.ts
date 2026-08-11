import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Users
  const salt = 10;
  const adminPassword = bcrypt.hashSync('admin123', salt);
  const salesPassword = bcrypt.hashSync('sales123', salt);
  const warehousePassword = bcrypt.hashSync('warehouse123', salt);
  const accountsPassword = bcrypt.hashSync('accounts123', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fundsroom.com' },
    update: {},
    create: {
      email: 'admin@fundsroom.com',
      passwordHash: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@fundsroom.com' },
    update: {},
    create: {
      email: 'sales@fundsroom.com',
      passwordHash: salesPassword,
      name: 'Sales Manager',
      role: 'SALES',
    },
  });

  const warehouse = await prisma.user.upsert({
    where: { email: 'warehouse@fundsroom.com' },
    update: {},
    create: {
      email: 'warehouse@fundsroom.com',
      passwordHash: warehousePassword,
      name: 'Warehouse Operator',
      role: 'WAREHOUSE',
    },
  });

  const accounts = await prisma.user.upsert({
    where: { email: 'accounts@fundsroom.com' },
    update: {},
    create: {
      email: 'accounts@fundsroom.com',
      passwordHash: accountsPassword,
      name: 'Accounts Executive',
      role: 'ACCOUNTS',
    },
  });

  console.log('Users seeded:', {
    admin: admin.email,
    sales: sales.email,
    warehouse: warehouse.email,
    accounts: accounts.email,
  });

  // 2. Create Products
  const productsData = [
    {
      name: 'Standard Galvanized Steel Bolts',
      sku: 'BOLT-STE-M10',
      category: 'Hardware',
      unitPrice: 12.50,
      currentStock: 500,
      minStockAlert: 100,
      location: 'Warehouse A - Section B1',
    },
    {
      name: 'Premium Grade Silicon Sealer',
      sku: 'SEAL-SIL-300',
      category: 'Consumables',
      unitPrice: 24.99,
      currentStock: 45,
      minStockAlert: 50, // Triggers alert since currentStock < minStockAlert
      location: 'Warehouse A - Section D4',
    },
    {
      name: 'Industrial Safety Goggles',
      sku: 'SAFE-GOG-IND',
      category: 'Safety',
      unitPrice: 18.00,
      currentStock: 120,
      minStockAlert: 20,
      location: 'Warehouse B - Section A2',
    },
    {
      name: 'Heavy Duty Power Drill 24V',
      sku: 'DRIL-HD-24V',
      category: 'Power Tools',
      unitPrice: 149.99,
      currentStock: 5,
      minStockAlert: 10, // Triggers alert
      location: 'Warehouse B - Section C1',
    },
    {
      name: 'L-Shape Bracket 150mm',
      sku: 'BRAC-LSH-150',
      category: 'Hardware',
      unitPrice: 4.25,
      currentStock: 0, // Out of stock!
      minStockAlert: 50,
      location: 'Warehouse A - Section B3',
    },
  ];

  const products = [];
  for (const item of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
    products.push(product);
  }
  console.log(`${products.length} Products seeded.`);

  // 3. Create Stock Movement Logs for initial products
  // Only create if logs don't exist
  const existingLogsCount = await prisma.stockMovementLog.count();
  if (existingLogsCount === 0) {
    for (const prod of products) {
      if (prod.currentStock > 0) {
        await prisma.stockMovementLog.create({
          data: {
            productId: prod.id,
            quantityChanged: prod.currentStock,
            movementType: 'IN',
            reason: 'Initial Seeding Stock',
            createdById: admin.id,
          },
        });
      }
    }
    console.log('Stock movement logs seeded.');
  }

  // 4. Create Customers & Follow-up Notes
  const customerData = [
    {
      name: 'TechSolutions Ltd',
      mobile: '+919876543210',
      email: 'procurement@techsolutions.com',
      businessName: 'TechSolutions Enterprise Private Limited',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: 'WHOLESALE',
      address: 'Plot 42, Hinjewadi Phase 2, Pune, Maharashtra - 411057',
      status: 'ACTIVE',
      notes: 'Key wholesaler client in western region. Orders quarterly.',
    },
    {
      name: 'BuildCraft Builders',
      mobile: '+918765432109',
      email: 'purchasing@buildcraft.in',
      businessName: 'BuildCraft Construction and Supply Ltd',
      gstNumber: '29BBBBB2222B2Z2',
      customerType: 'DISTRIBUTOR',
      address: '88 Double Road, Indiranagar, Bengaluru, Karnataka - 560038',
      status: 'ACTIVE',
      notes: 'Big distributor for South India region. Looking to extend credit terms.',
    },
    {
      name: 'Rajesh Hardware Store',
      mobile: '+917654321098',
      email: 'rajesh.hardware@gmail.com',
      businessName: 'Rajesh & Sons Hardware Store',
      gstNumber: undefined, // Optional
      customerType: 'RETAIL',
      address: 'Shop No 14, Main Market Road, Sector 15, Gurugram, Haryana - 122001',
      status: 'LEAD',
      notes: 'Walk-in inquiry. Interested in steel bolts and brackets. Needs discount quote.',
    },
  ];

  for (const cust of customerData) {
    const existing = await prisma.customer.findFirst({
      where: { email: cust.email },
    });
    if (!existing) {
      const customer = await prisma.customer.create({
        data: {
          name: cust.name,
          mobile: cust.mobile,
          email: cust.email,
          businessName: cust.businessName,
          gstNumber: cust.gstNumber,
          customerType: cust.customerType,
          address: cust.address,
          status: cust.status,
          notes: cust.notes,
          createdById: sales.id,
          followUpDate: cust.status === 'LEAD' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : undefined, // 3 days from now
        },
      });

      // Initial follow-up notes
      await prisma.followUpNote.create({
        data: {
          customerId: customer.id,
          note: `Customer profiles created by Sales. Initial notes: "${cust.notes}"`,
          createdById: sales.id,
        },
      });
    }
  }
  console.log('Customers and Follow-up notes seeded.');

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
