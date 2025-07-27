import { Request, Response, NextFunction } from 'express';
import { verifyToken, verifyCustomerToken } from './jwt';
import { JWTPayload, CustomerJWTPayload } from './types';

interface AuthenticatedRequest extends Request {
  merchant?: JWTPayload;
}

interface CustomerAuthenticatedRequest extends Request {
  customer?: CustomerJWTPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.merchant = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const authenticateCustomerToken = (req: CustomerAuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = verifyCustomerToken(token);
    req.customer = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export type { AuthenticatedRequest, CustomerAuthenticatedRequest }; 