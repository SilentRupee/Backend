import { Router } from 'express';
import { login, signup, getProfile, getProductCount, createProduct, getProductsByMerchant, getProductById, updateProduct, deleteProduct, Verify, Profile } from '../controllers/productController';
import { validateRequest } from '../../shared/validation/validationMiddleware';
import { productSchema } from '../../shared/validation/validation';

const router = Router();
router.post('/products', validateRequest(productSchema),createProduct);
router.get('/merchants/:merchantId/products', getProductsByMerchant);

router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
export const productRoute=router;