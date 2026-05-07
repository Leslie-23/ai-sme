import { Router } from 'express';
import { createSetupLead } from '../controllers/leadController';

const router = Router();
router.post('/setup', createSetupLead);
export default router;
