import { Router } from 'express';
import { runSupportQuery } from '../controllers/supportController';

const router = Router();

router.post('/query', runSupportQuery);

export default router;
