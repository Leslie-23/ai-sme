import { Router } from 'express';
import { createSale, listSales } from '../controllers/saleController';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
router.get('/', listSales);
router.post('/', requirePermission('recordSales'), createSale);
export default router;
