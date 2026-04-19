import { Router } from 'express';
import { requireOwner } from '../middleware/auth';
import { createStaff, deleteStaff, listTeam, updateStaff } from '../controllers/teamController';

const router = Router();
router.get('/', listTeam);
router.post('/', requireOwner, createStaff);
router.patch('/:id', requireOwner, updateStaff);
router.delete('/:id', requireOwner, deleteStaff);
export default router;
