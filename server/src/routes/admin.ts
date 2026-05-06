import { Router } from 'express';
import { getAdminAnalytics } from '../controllers/analyticsController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/analytics', requireOwner, getAdminAnalytics);
export default router;
