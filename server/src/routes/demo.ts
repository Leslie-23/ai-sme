import { Router } from 'express';
import {
  clearDemoBusiness,
  getDemoSeedStatus,
  getWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  seedDemoBusiness,
} from '../controllers/demoController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/status', requireOwner, getDemoSeedStatus);
router.get('/snapshot', requireOwner, getWorkspaceSnapshot);
router.post('/restore', requireOwner, restoreWorkspaceSnapshot);
router.post('/clear', requireOwner, clearDemoBusiness);
router.post('/seed', requireOwner, seedDemoBusiness);
export default router;
