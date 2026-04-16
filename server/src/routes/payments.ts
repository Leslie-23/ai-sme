import { Router } from 'express';
import { listPayments, createPayment } from '../controllers/paymentController';

const router = Router();
router.get('/', listPayments);
router.post('/', createPayment);
export default router;
