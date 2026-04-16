import { Router } from 'express';
import { listInventory, adjustInventory } from '../controllers/inventoryController';

const router = Router();
router.get('/', listInventory);
router.post('/adjust', adjustInventory);
export default router;
