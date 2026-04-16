import { Router } from 'express';
import { getConfig, updateConfig } from '../controllers/configController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/', getConfig);
router.put('/', requireOwner, updateConfig);
export default router;
