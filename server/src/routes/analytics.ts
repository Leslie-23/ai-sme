import { Router } from 'express';
import { createAnalyticsEvent } from '../controllers/analyticsController';

const router = Router();
router.post('/events', createAnalyticsEvent);
export default router;
