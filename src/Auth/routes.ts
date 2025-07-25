import { Router } from 'express';
import { login, signup, getProfile, getProductCount, createProduct, getProductsByMerchant, getProductById, updateProduct, deleteProduct, Verify, Profile } from './controller';
import { authenticateToken } from './middleware';
import { validateRequest, asyncHandler } from './validationMiddleware';
import { loginSchema, signupSchema, verifyotp } from './validation';

const router = Router();


router.post('/login', validateRequest(loginSchema), asyncHandler(login));
router.post('/signup', validateRequest(signupSchema), asyncHandler(signup));
router.post('/verify', validateRequest(verifyotp), asyncHandler(Verify));
router.post('/profile', asyncHandler(Profile));
router.get('/profile', authenticateToken, asyncHandler(getProfile));
router.get('/merchants/:merchantId/product-count', getProductCount);

router.post('/products', createProduct);
router.get('/merchants/:merchantId/products', getProductsByMerchant);

router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

export default router; 