import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';
import { JWTPayload } from './types';

interface AuthenticatedRequest extends Request {
  merchant?: JWTPayload;
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

export type { AuthenticatedRequest }; 