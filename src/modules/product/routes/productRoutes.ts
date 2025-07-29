import { Router } from 'express';
import { login, signup, getProfile, getProductCount, createProduct, getProductsByMerchant, getProductById, updateProduct, deleteProduct, Verify, Profile, purchaseProduct, getWalletHistory } from '../controllers/productController';
import { validateRequest } from '../../shared/validation/validationMiddleware';
import { productSchema, purchaseSchema } from '../../shared/validation/validation';
import { authenticateCustomerToken } from '../../shared/middleware/authMiddleware';

const router = Router();
router.post('/products', validateRequest(productSchema),createProduct);
router.get('/merchants/:merchantId/products', getProductsByMerchant);

router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Purchase route - requires customer authentication
router.post('/purchase', authenticateCustomerToken, validateRequest(purchaseSchema), purchaseProduct);

// Wallet history route - get transaction history for user
router.get('/wallet/:userType/:userId', getWalletHistory);

export const productRoute=router;