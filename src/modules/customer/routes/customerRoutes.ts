import { Router } from 'express';
import { 
  customerLogin, 
  customerSignup, 
  customerVerify, 
  customerProfile, 
  getCustomerProfile 
} from '../controllers/customerController';
import { authenticateCustomerToken } from '../../shared/middleware/authMiddleware';
import { validateRequest, asyncHandler } from '../../shared/validation/validationMiddleware';
import { 
  customerLoginSchema, 
  customerSignupSchema, 
  customerVerifyOtpSchema,
  customerProfileSchema 
} from '../../shared/validation/validation';

const router = Router();

// Customer authentication routes
router.post('/login', validateRequest(customerLoginSchema), asyncHandler(customerLogin));
router.post('/signup', validateRequest(customerSignupSchema), asyncHandler(customerSignup));
router.post('/verify', validateRequest(customerVerifyOtpSchema), asyncHandler(customerVerify));
router.patch('/profile', validateRequest(customerProfileSchema), asyncHandler(customerProfile));
router.get('/profile', authenticateCustomerToken, asyncHandler(getCustomerProfile));

export default router;