import { Router } from 'express';
import { createExpenseController, deleteExpenseController, listExpensesController, updateExpenseController } from '../controllers/expenseController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/:id/expenses', listExpensesController);
router.post('/:id/expenses', createExpenseController);
router.put('/expenses/:id', updateExpenseController);
router.delete('/expenses/:id', deleteExpenseController);

export default router;
