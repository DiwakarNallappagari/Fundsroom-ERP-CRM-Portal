import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface UserJWTPayload {
  id: string;
  email: string;
  name: string;
  role: string; // 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS'
}

export interface RequestWithUser extends Request {
  user?: UserJWTPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_erp_crm_jwt_key_12345';

export const authenticateJWT = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Access denied. No token provided.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserJWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token.', 403));
  }
};

export const requireRoles = (allowedRoles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const hasRole = allowedRoles.includes(req.user.role.toUpperCase());
    if (!hasRole) {
      return next(
        new AppError(
          `Permission denied. Requiring role: [${allowedRoles.join(', ')}]. Found: ${req.user.role}`,
          403
        )
      );
    }

    next();
  };
};
