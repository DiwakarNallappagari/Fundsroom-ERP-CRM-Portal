# Fundsroom ERP + CRM Operations Portal — Technical Documentation

## 1. Project Overview & Business Value
This project is a custom-engineered, full-stack **ERP (Enterprise Resource Planning)** and **CRM (Customer Relationship Management)** system designed for wholesale and distribution operations. It addresses the workflow complexities of managing corporate partnerships, tracking inventory movements, validating stock transactions, and creating billing challans.

The system integrates secure role-based authorization across four distinct operational roles (Admin, Sales, Warehouse, and Accounts), ensuring data privacy and correct separation of concerns.

---

## 2. System Architecture
The application is built on a modern, decoupled client-server architecture using a single monorepo repository structure:

```text
[React Frontend SPA (Vite)] 
            │
            │ HTTPS / JSON REST API (JWT Authenticated)
            ▼
[Node.js + Express API Server (TypeScript)]
            │
            │ Prisma Client ORM
            ▼
[Neon Cloud PostgreSQL Database]
```

- **Frontend Portal:** React application built with TypeScript, served as a Single Page Application (SPA), utilizing custom CSS grids and glassmorphism design variables.
- **Backend API:** Node.js Express server written in strict TypeScript. Request bodies are validated using Zod schemas before hitting database layers.
- **Database:** Deployed on Neon Cloud PostgreSQL, implementing transactional consistency checks for core transactions.

---

## 3. Key System Features

### 🔐 Role-Based Access Control (RBAC)
System access is restricted by operational scope. Authorization checks are executed on the API server via a custom `requireRole` middleware:

| Role | Email Credential | Access Scope |
|---|---|---|
| **Admin** | `admin@fundsroom.com` | Full administrative read/write access across all system modules. |
| **Sales Agent** | `sales@fundsroom.com` | CRM management, customer follow-up notes, sales challan creation, view stock. |
| **Warehouse Operator** | `warehouse@fundsroom.com` | Registered SKU modifications, manual stock adjustments, logs viewing. CRM blocked. |
| **Accounts Executive** | `accounts@fundsroom.com` | CRM review, inventory visibility, challan status transitions, PDF invoice export. |

### 👥 Customer CRM
Enables sales and accounts teams to create business files, filter by customer type (Retailer, Distributor, Wholesaler), and log follow-up notes that compile into a chronological interaction timeline.

### 📦 Inventory & Stock Adjustments
Tracks active stock quantities against minimum stock thresholds. Includes visual alert badges when stock falls below warning levels, storage location listings, and automated stock movement audit log history tracking.

### 🧾 Sales Challans
Implements multi-item challan creation with two core workflow steps:
1. **Draft state:** Serves as a quotation and does not reserve or deduct inventory.
2. **Confirmed state:** Triggers an atomic PostgreSQL database transaction that validates stock availability, deducts quantities, and records logs. If a challan is cancelled, the transaction restores the allocated stock.

---

## 4. API Endpoint Documentation
All endpoints (except login) require the JWT header: `Authorization: Bearer <token>`.

### 🔐 Authentication Endpoints
- `POST /api/auth/login` — Authenticates credentials and returns JWT session token.
- `GET /api/auth/me` — Retrieves current user role and session details.

### 👥 CRM Customer Endpoints
- `GET /api/customers` — Lists business profiles with search and type filters.
- `POST /api/customers` — Registers new customer client cards.
- `GET /api/customers/:id` — Retrieves detailed client profile and notes logs.
- `POST /api/customers/:id/notes` — Appends follow-up note to customer timeline.

### 📦 Product Inventory Endpoints
- `GET /api/products` — Lists registered product catalog with stock counts.
- `POST /api/products` — Registers new catalog SKU (Warehouse only).
- `POST /api/products/:id/stock` — Logs custom stock adjustment logs.
- `GET /api/products/:id/movements` — Returns audit logs for a specific SKU.

### 🧾 Sales Challan Endpoints
- `GET /api/challans` — Lists sales challan billing history.
- `POST /api/challans` — Generates new billing challan (starts in Draft).
- `PUT /api/challans/:id/status` — Transition status (DRAFT ➔ CONFIRMED ➔ CANCELLED).

---

## 5. Core Design Decisions

### Item Pricing Snapshots
Product prices often change. To maintain historical audit durability, product variables (name, SKU, unit price) are permanently copied into `SalesChallanItem` when a challan is created. Subsequent changes to the product catalog do not retroactively alter previously confirmed receipts.

### Inventory Transactions
- **Draft Challans** represent estimates and do not lock or allocate inventory.
- **Confirmed Challans** trigger an atomic database transaction that verifies stock levels, allocates stock, and logs movements.
- **Cancelled Challans** automatically increment inventory levels back to restore previously allocated stock.

---

## 6. Live Deployments
- **Frontend Portal (Vercel):** [https://fundsroom-erp-crm-portal.vercel.app](https://fundsroom-erp-crm-portal.vercel.app)
- **Backend REST API (Render):** [https://fundsroom-erp-crm-portal.onrender.com](https://fundsroom-erp-crm-portal.onrender.com)
- **API Health Check:** [https://fundsroom-erp-crm-portal.onrender.com/health](https://fundsroom-erp-crm-portal.onrender.com/health)
