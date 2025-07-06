import { Router } from 'express';
import { login, signup, getProfile } from './controller';
import { authenticateToken } from './middleware';
import { validateRequest, asyncHandler } from './validationMiddleware';
import { loginSchema, signupSchema } from './validation';

const router = Router();

// Public routes with validation
router.post('/login', validateRequest(loginSchema), asyncHandler(login));
router.post('/signup', validateRequest(signupSchema), asyncHandler(signup));

// Protected routes
router.get('/profile', authenticateToken, asyncHandler(getProfile));

export default router; 