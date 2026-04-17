import { Router } from 'express';
import { extractImport, applyImport } from '../controllers/importController';

const router = Router();
router.post('/extract', extractImport);
router.post('/apply', applyImport);
export default router;
