import { Router } from 'express';
import { getReport } from '../controllers/reportController';

const router = Router();
router.get('/', getReport);
export default router;
