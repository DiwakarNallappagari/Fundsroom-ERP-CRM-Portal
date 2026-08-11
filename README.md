# Mini ERP + CRM Operations Portal

A full-stack ERP & CRM Operations Portal built for a wholesale/distribution company. This system orchestrates role-based authentication, Customer CRM follow-ups, product inventory tracking, and Sales Challan generation with strict transactional stock checks.


## 🌐 Live Demo

### Frontend
https://fundsroom-erp-crm-portal.vercel.app

### Backend API
https://fundsroom-erp-crm-portal.onrender.com

### API Health
https://fundsroom-erp-crm-portal.onrender.com/health
---

## 📸 Screenshots

### Operations Dashboard
![Dashboard](screenshots/dashboard.png)

### Customer CRM
![CRM](screenshots/crm.png)

### Product Inventory
![Inventory](screenshots/inventory.png)

### Sales Challan
![Challan](screenshots/challan.png)

---

## 🔑 Test Login Credentials (By Role)

The Login page includes **Quick Demo Login buttons** at the bottom for instant forms pre-filling.

| Role | Email Address | Password | Access Details |
|---|---|---|---|
| **Admin** | `admin@fundsroom.com` | `admin123` | Full access across all modules. |
| **Sales** | `sales@fundsroom.com` | `sales123` | CRM Customers & Notes, create Sales Challans (Draft/Confirmed), view Inventory stock levels. |
| **Warehouse** | `warehouse@fundsroom.com` | `warehouse123` | Restricted from CRM. Create/Edit SKUs, adjust stock levels with logs, view Challans. |
| **Accounts** | `accounts@fundsroom.com` | `accounts123` | Customer CRM, View Inventory, inspect and transition Sales Challan status (Draft ➔ Confirmed ➔ Cancelled), Print/PDF invoices. |

---

## 🏗️ Architecture & Server Setup

### System Architecture
The application is built using a monorepo structure with a decoupled client-server architecture:

```
[React SPA]
      │
      │ HTTPS / REST API
      ▼
[Express + TypeScript]
      │
      │ Prisma ORM
      ▼
[PostgreSQL]
```

### Server Setup (Backend)
1. **Framework**: Node.js with **Express.js** and **TypeScript** (using `tsx` for dev run and `tsc` for production builds).
2. **CORS & Parsers**: Configured with standard security CORS parameters and body-parser middleware.
3. **Database Layer**: **Prisma ORM** integrated with a **PostgreSQL** database (default production & docker targets).
4. **Validation & Errors**: Centralized custom Express error middleware capturing database constraints and **Zod schema request validation errors** automatically.
5. **Session Management**: JWT session management with hashed credentials using **Bcryptjs**.

---

## 🔒 Environment Variables Management

All private configurations are kept in `.env` files which are ignored in `.gitignore` and **never pushed to GitHub**. 

To set up the server environment locally, create a `backend/.env` file:
```ini
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="your-secure-secret"
NODE_ENV=development
PORT=4000
```

---

## 🚀 Running the Project Locally

The project can be run locally using either **Docker Compose (PostgreSQL)** or using a **zero-dependency SQLite fallback**.

### Option A: Local Run with Docker (PostgreSQL)

This compiles both the frontend and backend, provisions a local PostgreSQL database container, pushes the tables, and seeds the default login credentials automatically.

1. Open your terminal in the root directory and run:
   ```bash
   docker-compose up --build
   ```
2. Once running, open:
   - **Frontend UI Portal**: `http://localhost`
   - **Backend API Endpoints**: `http://localhost/api` (proxied)

### Option B: Local Run without Docker (SQLite Fallback)

If you do not have Docker or a local PostgreSQL instance running, you can run the project standalone on your host machine using SQLite:

1. **Toggle Prisma Schema to SQLite**:
   Open `backend/prisma/schema.prisma` and change the datasource provider:
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. **Change Database URL in `.env`**:
   Open `backend/.env` and update the connection URL:
   ```ini
   DATABASE_URL="file:./dev.db"
   ```
3. **Install Dependencies & Seed Database**:
   Navigate to the `backend/` folder and run:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   ```
   *This initializes the local database file `dev.db`, sets up tables, and inserts the dummy data.*
4. **Start the API Server**:
   ```bash
   npm run dev
   ```
5. **Start the React Client**:
   Open a new terminal tab, navigate to the `frontend/` folder:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173/` in your browser.


---

## 🛸 Deploying the Project

### Database Deployment (Supabase or Neon)
1. Provision a free PostgreSQL database on [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/).
2. Copy the connection string.

### Backend API Deployment (Render or Railway)
1. Link your GitHub repository to a new Web Service on [Render](https://render.com/).
2. Configure these parameters:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install --production=false && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
3. Add the following **Environment Variables**:
   - `DATABASE_URL` = *(Your live PostgreSQL connection string)*
   - `JWT_SECRET` = *(Your secret token)*
   - `NODE_ENV` = `production`

### Frontend Deployment (Vercel or Netlify)
1. Create a new static project on [Vercel](https://vercel.com/) importing your repository.
2. Select `frontend` as the root directory, using Vite presets.
3. Deploy. All client routers are configured to fallback to `index.html` (supporting Single Page App routes).

---

## 📝 Assumptions Made

1. **Local Sandbox Execution**: Assumed that recruiters evaluating the code may not have a running Docker environment or local PostgreSQL instance. Therefore, the local execution fallback is SQLite, requiring zero external server configuration.
2. **Product Snapshots**: Assumed that product pricing and definitions change over time. When a Sales Challan is created, the item details (name, SKU, unit price) are permanently snapshotted into `SalesChallanItem`. Subsequent changes to the main Product catalog will not alter historical invoices.
3. **Draft States**: Assumed that drafts are preliminary estimates and do not lock or reserve inventory. Only confirmed challans reduce stock levels.

---

## ⚠️ Known Limitations or Incomplete Parts

1. **S3 File Upload**: AWS S3 product-image upload is an optional bonus feature and was not implemented because it was outside the core assignment scope.
2. **Admin User Registrations**: Admins can view metrics, but creating new users/changing roles requires running direct SQL operations or modifying the seed script; a user-creation UI form is out of scope for this MVP.
3. **Session Revocation**: JWT sessions are client-side stateless. Revoking a token early requires introducing a Redis blacklist database, which is omitted to keep the project lightweight.

---

## 📬 Postman Collection / API Documentation

The Postman API endpoints list is included in the project root:
- **File**: `Fundsroom_ERP_CRM_Postman_Collection.json`

Import this file into Postman to test authentication request bodies, customers creation payloads, inventory log audits, and transactional challans.
