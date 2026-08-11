# Mini ERP + CRM Operations Portal

A full-stack ERP & CRM Operations Portal built for a wholesale/distribution company. This system orchestrates role-based authentication, Customer CRM follow-ups, product inventory tracking, and Sales Challan generation with strict transactional stock checks.

---

## 📸 Screenshots

*Note: Please take screenshots of your local running instance at `http://localhost:5173/` and save them inside the `screenshots/` directory as `dashboard.png`, `crm.png`, and `challan.png` to have them render here.*

### 1. Operations Dashboard
![Dashboard Screenshot](screenshots/dashboard.png)

### 2. Customer CRM Detail Timeline
![CRM Screenshot](screenshots/crm.png)

### 3. Sales Challan Builder
![Sales Challan Screenshot](screenshots/challan.png)

### 4. Product Inventory & Stock Alerts
![Inventory Screenshot](screenshots/inventory.png)

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
[React SPA Client (Port 5173)] <--- HTTP REST API ---> [Express.js API Server (Port 4000)]
                                                                |
                                                           (Prisma ORM)
                                                                v
                                                       [SQLite Database File]
```

### Server Setup (Backend)
1. **Framework**: Node.js with **Express.js** and **TypeScript** (using `tsx` for live-reload development and `tsc` for production transpilation).
2. **CORS & Parsers**: Wired with cross-origin resource sharing middleware and standard JSON body parsers.
3. **Database Layer**: **Prisma ORM** interacting with a local **SQLite** file database (`dev.db`). Under production docker builds, this provider is easily toggled back to standard PostgreSQL.
4. **Validation & Errors**: Centralized custom error middleware mapping database violations and schema validations verified via **Zod schemas** before database commits.
5. **Session Management**: Auth tokens are generated using JSON Web Tokens (JWT) with hashed passwords stored via **Bcryptjs**.

---

## 🔒 Environment Variables Management

For security compliance, all `.env` files are added to the root `.gitignore` file so they are **hidden and never pushed to GitHub**. 

A template file is provided at `backend/.env.example` to let developers configure their environment.

To set up the server environment locally, create a `backend/.env` file with these values:
```ini
PORT=4000
DATABASE_URL="file:./dev.db" # Local SQLite DB file
JWT_SECRET=super_secret_erp_crm_jwt_key_12345
NODE_ENV=development
```

---

## 🚀 Running the Project Locally

Since Docker is not installed on all evaluation machines, the local project is configured to run using a zero-dependency local SQLite database.

### 1. Database Setup & Seeding
In your terminal, navigate to the `backend/` folder and run:
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
```
*This command generates the Prisma client types, creates the local SQLite database file (`dev.db`), creates all relational tables, and seeds the test user roles, initial stock, and customers.*

### 2. Start the Backend API Server
```bash
npm run dev
```
The API server will launch at `http://localhost:4000/`.

### 3. Start the Frontend React Client
In a new terminal window, navigate to the `frontend/` folder:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will launch at `http://localhost:5173/`. Vite is configured with a reverse proxy to route `/api/*` calls automatically to the backend on port 4000.

---

## 🛸 Deploying the Project

### Database Deployment (Supabase or Neon)
1. Provision a free PostgreSQL database on [Neon.tech](https://neon.tech/) or [Supabase.com](https://supabase.com/).
2. Copy the connection string.

### Backend API Deployment (Render or Railway)
1. Link your GitHub repository to a new Web Service on [Render](https://render.com/).
2. Configure these parameters:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma db push && npm run prisma:seed && node dist/index.js`
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

1. **S3 File Upload**: The prompt outlines uploading product pictures to AWS S3. Under local sandbox running conditions, we stubbed image paths using icons to bypass AWS credential setup costs.
2. **Admin User Registrations**: Admins can view metrics, but creating new users/changing roles requires running direct SQL operations or modifying the seed script; a user-creation UI form is out of scope for this MVP.
3. **Session Revocation**: JWT sessions are client-side stateless. Revoking a token early requires introducing a Redis blacklist database, which is omitted to keep the project lightweight.

---

## 📬 Postman Collection / API Documentation

The Postman API endpoints list is included in the project root:
- **File**: `Fundsroom_ERP_CRM_Postman_Collection.json`

Import this file into Postman to test authentication request bodies, customers creation payloads, inventory log audits, and transactional challans.
