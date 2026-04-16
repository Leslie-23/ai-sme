import { Router } from 'express';
import { listExpenses, createExpense } from '../controllers/expenseController';

const router = Router();
router.get('/', listExpenses);
router.post('/', createExpense);
export default router;
