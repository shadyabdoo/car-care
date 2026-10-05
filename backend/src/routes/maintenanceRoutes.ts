import { Router } from 'express';
import { createMaintenanceController, deleteMaintenanceController, listMaintenanceController, updateMaintenanceController } from '../controllers/maintenanceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/:id/maintenance', listMaintenanceController);
router.post('/:id/maintenance', createMaintenanceController);
router.put('/maintenance/:id', updateMaintenanceController);
router.delete('/maintenance/:id', deleteMaintenanceController);

export default router;
