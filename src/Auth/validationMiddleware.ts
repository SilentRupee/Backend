import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, ErrorResponse } from './validation';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate the request body against the schema
      const validatedData = schema.parse(req.body);
      
      // Replace req.body with validated and parsed data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const validationErrors: ValidationError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        const errorResponse: ErrorResponse = {
          error: 'Validation failed',
          details: validationErrors
        };

        res.status(400).json(errorResponse);
        return;
      }

      // Handle unexpected errors
      console.error('Validation middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error during validation' 
      });
    }
  };
};

// Global error handler for async route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handling middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors: ValidationError[] = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message
    }));

    const errorResponse: ErrorResponse = {
      error: 'Validation failed',
      details: validationErrors
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle other known errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({ error: 'Token expired' });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({ error: 'Database operation failed' });
    return;
  }

  // Default error response
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
}; 