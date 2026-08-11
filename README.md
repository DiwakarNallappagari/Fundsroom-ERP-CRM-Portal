# Fundsroom ERP + CRM Operations Portal

A production-ready full-stack ERP + CRM platform designed for wholesale and distribution operations.

The system provides role-based access control (RBAC), customer relationship management (CRM), product and inventory management, stock movement auditing, sales challan generation, and transactional inventory validation.

---

## 🌐 Live Application

**Frontend:**  
[https://fundsroom-erp-crm-portal.vercel.app](https://fundsroom-erp-crm-portal.vercel.app)

**Backend API:**  
[https://fundsroom-erp-crm-portal.onrender.com](https://fundsroom-erp-crm-portal.onrender.com)

**API Health Check:**  
[https://fundsroom-erp-crm-portal.onrender.com/health](https://fundsroom-erp-crm-portal.onrender.com/health)

---

## ✨ Key Features

### 🔐 Role-Based Authentication
Four operational roles with permission-based access:
- **Admin** — Full system access across all modules.
- **Sales** — Customer CRM, follow-ups, sales challan creation, inventory visibility.
- **Warehouse** — Product management, stock adjustments, inventory operations, restricted from CRM.
- **Accounts** — Customer access, inventory visibility, challan status transitions, invoice prints.

*Authentication is implemented using stateless JWT with bcrypt password hashing.*

### 👥 Customer CRM
- Customer creation and profile management
- Real-time customer search and type/status filtering
- Multi-user follow-up notes logs
- Chronological timeline tracking
- Role-based CRM read/write restrictions

### 📦 Product & Inventory Management
- Product/SKU registration and categorization
- Unit pricing and warehouse storage locations
- Initial stock configurations and minimum stock warning indicators
- Automated stock movement audit log history
- Advanced inventory search, filtering, and stock adjustments

### 🧾 Sales Challans
- Multiline sales challan creator wizard
- Draft and Confirmed states transitions
- Atomic database transactions validating stock availability
- Automatic stock deduction for confirmed challans (with rollback on cancellation)
- Historical pricing/SKU snapshots on challan line items
- PDF Invoice generation and downloading

---

## 🏗️ Production Architecture

```text
┌──────────────────────────────┐
│         React + Vite         │
│         Frontend SPA         │
└──────────────┬───────────────┘
               │ HTTPS / REST API (JWT Auth)
               ▼
┌──────────────────────────────┐
│      Node.js + Express       │
│        TypeScript API        │
└──────────────┬───────────────┘
               │ Prisma ORM
               ▼
┌──────────────────────────────┐
│       Neon PostgreSQL        │
│       Production Database    │
└──────────────────────────────┘
```

- **Frontend Deployment** ➔ Vercel
- **Backend Deployment** ➔ Render
- **Database Hosting** ➔ Neon Cloud PostgreSQL

---

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Vanilla CSS
- **Backend**: Node.js, Express.js, TypeScript, JWT, bcryptjs, Zod
- **Database**: PostgreSQL, Prisma ORM
- **DevOps & Testing**: Docker Compose, Vercel, Render, Neon, Postman, Git/GitHub

---

## 📁 Project Structure

```text
Fundsroom-ERP-CRM-Portal/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   └── src/
│       ├── middleware/
│       ├── routes/
│       └── index.ts
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── screenshots/
│   ├── dashboard.png
│   ├── crm.png
│   ├── inventory.png
│   └── challan.png
│
├── Fundsroom_ERP_CRM_Postman_Collection.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🔑 Demo Access & Test Credentials

The Login page includes **Quick Demo Login buttons** at the bottom for instant forms pre-filling during evaluation.

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@fundsroom.com` | `admin123` | Full access across all modules. |
| **Sales** | `sales@fundsroom.com` | `sales123` | Customer CRM, Log notes, Create Challans (Draft/Confirmed), View Stock. |
| **Warehouse** | `warehouse@fundsroom.com` | `warehouse123` | Blocked from CRM. Edit products, log stock adjustments, view challans. |
| **Accounts** | `accounts@fundsroom.com` | `accounts123` | Read CRM, View inventory, transition Challan status, Print/PDF invoices. |

---

## 📚 API Documentation

All endpoints require JWT authorization passed via headers as `Authorization: Bearer <token>` (except authentication endpoints).

### 🔐 Authentication
- `POST /api/auth/login` — Login user. Request body: `{ email, password }`. Returns JWT token and user profile.
- `GET /api/auth/me` — Verify session and retrieve current logged-in user profile.

### 👥 Customer CRM
- `GET /api/customers` — Get customers list with optional search, type, and status query filters.
- `POST /api/customers` — Create a new customer. Request body: `{ name, mobile, email, businessName, gstNumber, customerType, address }`.
- `GET /api/customers/:id` — Retrieve a single customer profile including follow-up notes history.
- `PUT /api/customers/:id` — Update customer details.
- `POST /api/customers/:id/notes` — Append a follow-up log note to the customer's timeline. Request body: `{ note }`.

### 📦 Product Inventory
- `GET /api/products` — Retrieve inventory items with low-stock warnings and category filters.
- `POST /api/products` — Register a new product SKU. Request body: `{ name, sku, category, unitPrice, currentStock, minStockAlert, location }`.
- `PUT /api/products/:id` — Update product metrics, unit price, or location.
- `POST /api/products/:id/stock` — Record a stock adjustment and audit log. Request body: `{ quantityChanged, movementType, reason }`.
- `GET /api/products/:id/movements` — View audit history logs for a specific SKU.

### 🧾 Sales Challans
- `GET /api/challans` — Get all sales challans history with status filter.
- `POST /api/challans` — Create a new sales challan. Request body: `{ customerId, items: [{ productId, quantity }] }`. Automatically snapshots product prices and metadata.
- `GET /api/challans/:id` — View details of a specific challan with snapshotted line items.
- `PUT /api/challans/:id/status` — Transition status between `DRAFT`, `CONFIRMED`, or `CANCELLED`. Deducts stock on confirmation, and rolls back allocated quantities on cancellation.

---

## 🚀 Local Development

### Prerequisites
- Node.js & npm
- PostgreSQL (or Docker)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create your `backend/.env` file:
   ```ini
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fundsroom_erp"
   JWT_SECRET="your-local-secret"
   NODE_ENV=development
   PORT=4000
   ```
3. Generate the Prisma Client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
   *Backend API is hosted at: `http://localhost:4000`*

### Frontend Setup
1. In a new terminal tab, navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Frontend is hosted at: `http://localhost:5173`*

---

## 🚀 Production Deployment

### Frontend — Vercel
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL` = `https://fundsroom-erp-crm-portal.onrender.com` (Your Render API URL)

### Backend — Render
- **Root Directory**: `backend`
- **Build Command**: `npm install --production=false && npx prisma generate && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `DATABASE_URL` = *(Your live Neon PostgreSQL connection string)*
  - `JWT_SECRET` = *(Your secure production secret token)*
  - `NODE_ENV` = `production`
  - `PORT` = `4000`

---

## 📸 Application Screenshots

### Operations Dashboard
![Dashboard](screenshots/dashboard.png)

### Customer CRM
![CRM](screenshots/crm.png)

### Product Inventory
![Inventory](screenshots/inventory.png)

### Sales Challan
![Challan](screenshots/challan.png)

---

## 💡 Design Decisions

### Product Snapshots
Sales challan items store duplicate snapshots of `productNameSnapshot`, `productSkuSnapshot`, and `unitPriceSnapshot`. This ensures historical invoices and financial ledger entries remain 100% accurate even if details in the master product catalog change in the future.

### Inventory Transactions
- **Draft Challans** represent estimates and do not lock or allocate inventory.
- **Confirmed Challans** trigger an atomic database transaction that verifies stock levels, allocates stock, and logs movements.
- **Cancelled Challans** automatically increment inventory levels back to restore previously allocated stock.

---

## ⚠️ Known Limitations

1. **AWS S3 Integration**: AWS S3 product-image upload is an optional bonus feature and was not implemented because it was outside the core assignment scope.
2. **Admin user management**: Creating new accounts and changing roles is done via Prisma seed/migration SQL commands rather than an admin interface.
3. **JWT session revocation**: JWT tokens are stateless. Revoking credentials before token expiry requires introducing a server-side blacklist database (like Redis) which was omitted to keep the deployment simple.

---

## 🧪 API Testing

An API collection is saved in the repository root:
- **File**: `Fundsroom_ERP_CRM_Postman_Collection.json`

Import this collection directly into Postman, configure the base path env, and run the pre-configured integration requests.
