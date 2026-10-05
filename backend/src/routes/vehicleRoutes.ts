import { Router } from 'express';
import { createVehicleController, deleteVehicleController, getVehicleController, listVehiclesController, updateMileageController, updateVehicleController } from '../controllers/vehicleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', listVehiclesController);
router.post('/', createVehicleController);
router.get('/:id', getVehicleController);
router.put('/:id', updateVehicleController);
router.delete('/:id', deleteVehicleController);
router.patch('/:id/mileage', updateMileageController);

export default router;
