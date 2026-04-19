import { Router } from 'express';
import {
  cancelSubscription,
  getBillingStatus,
  startCheckout,
  verifyCheckout,
} from '../controllers/billingController';

const router = Router();
router.get('/status', getBillingStatus);
router.post('/checkout', startCheckout);
router.post('/verify', verifyCheckout);
router.post('/cancel', cancelSubscription);
export default router;
