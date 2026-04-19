import { Router } from 'express';
import { listExpenses, createExpense } from '../controllers/expenseController';
import { requirePermission } from '../middleware/requirePermission';

const router = Router();
router.get('/', requirePermission('manageExpenses'), listExpenses);
router.post('/', requirePermission('manageExpenses'), createExpense);
export default router;
