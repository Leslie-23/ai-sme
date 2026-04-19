import { Router } from 'express';
import {
  exportAllJson,
  exportProductsCsv,
  exportSalesCsv,
} from '../controllers/exportController';

const router = Router();
router.get('/all.json', exportAllJson);
router.get('/products.csv', exportProductsCsv);
router.get('/sales.csv', exportSalesCsv);
export default router;
