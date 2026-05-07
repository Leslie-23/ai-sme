import { Router } from 'express';
import { getDemoSeedStatus, seedDemoBusiness } from '../controllers/demoController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/status', requireOwner, getDemoSeedStatus);
router.post('/seed', requireOwner, seedDemoBusiness);
export default router;
