import { Router } from 'express';
import { seedDemoBusiness } from '../controllers/demoController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.post('/seed', requireOwner, seedDemoBusiness);
export default router;
