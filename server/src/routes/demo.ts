import { Router } from 'express';
import { clearDemoBusiness, getDemoSeedStatus, seedDemoBusiness } from '../controllers/demoController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/status', requireOwner, getDemoSeedStatus);
router.post('/clear', requireOwner, clearDemoBusiness);
router.post('/seed', requireOwner, seedDemoBusiness);
export default router;
