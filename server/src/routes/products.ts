import { Router } from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';

const router = Router();
router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
export default router;
