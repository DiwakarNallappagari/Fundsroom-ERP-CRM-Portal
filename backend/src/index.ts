import dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import productRoutes from './routes/products';
import challanRoutes from './routes/challans';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/challans', challanRoutes);

app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Fundsroom ERP CRM API is running",
    status: "OK"
  });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'ERP-CRM Backend API',
  });
});

// Centralized error handler
app.use(errorHandler);

// Start Server
app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`===============================================`);
  console.log(` Server running on port ${PORT} (host: 0.0.0.0)`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===============================================`);
});
