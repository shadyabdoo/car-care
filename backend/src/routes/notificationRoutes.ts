import { Router } from 'express';
import { listNotificationsController, markAllNotificationsReadController, markNotificationReadController } from '../controllers/notificationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', listNotificationsController);
router.patch('/:id/read', markNotificationReadController);
router.patch('/read-all', markAllNotificationsReadController);

export default router;
