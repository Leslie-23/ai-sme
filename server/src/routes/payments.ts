import { Router } from 'express';
import { listPayments, createPayment } from '../controllers/paymentController';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
router.get('/', requirePermission('managePayments'), listPayments);
router.post('/', requirePermission('managePayments'), createPayment);
export default router;
