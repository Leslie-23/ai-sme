import { Router } from 'express';
import { getBusiness, updateBusiness } from '../controllers/businessController';
import { requireOwner } from '../middleware/auth';

const router = Router();
router.get('/', getBusiness);
router.put('/', requireOwner, updateBusiness);
export default router;
