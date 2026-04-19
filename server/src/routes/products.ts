import { Router } from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
router.get('/', listProducts);
router.post('/', requirePermission('manageInventory'), createProduct);
router.put('/:id', requirePermission('manageInventory'), updateProduct);
router.delete('/:id', requirePermission('manageInventory'), deleteProduct);
export default router;
