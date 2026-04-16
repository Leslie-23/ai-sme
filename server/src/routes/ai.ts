import { Router } from 'express';
import { runAIQuery } from '../controllers/aiController';

const router = Router();
router.post('/query', runAIQuery);
export default router;
