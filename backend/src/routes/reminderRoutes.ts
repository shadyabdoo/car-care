import { Router } from 'express';
import { createReminderController, deleteReminderController, listRemindersController, updateReminderController } from '../controllers/reminderController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/:id/reminders', listRemindersController);
router.post('/:id/reminders', createReminderController);
router.put('/reminders/:id', updateReminderController);
router.delete('/reminders/:id', deleteReminderController);

export default router;
