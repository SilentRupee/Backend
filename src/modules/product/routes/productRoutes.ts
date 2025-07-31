import { Router } from 'express';
import { getProductCount, createProduct, getProductsByMerchant, getProductById, updateProduct, deleteProduct, purchaseProduct, getWalletHistory, generateQRCode } from '../controllers/productController';
import { validateRequest } from '../../shared/validation/validationMiddleware';
import { productSchema, purchaseSchema } from '../../shared/validation/validation';
import { authenticateCustomerToken } from '../../shared/middleware/authMiddleware';

const router = Router();
router.post('/products', validateRequest(productSchema),createProduct);
router.get('/merchants/:merchantId/products', getProductsByMerchant);

router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

router.post('/purchase', authenticateCustomerToken, validateRequest(purchaseSchema), purchaseProduct);

// QR Code generation route
router.post('/merchants/:merchantId/qr-code', generateQRCode);

// Wallet history route - get transaction history for user
router.get('/wallet/:userType/:userId', getWalletHistory);

export const productRoute=router;