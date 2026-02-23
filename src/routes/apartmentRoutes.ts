import { Router } from 'express';
import { getApartments, getApartmentById } from '../controllers/apartmentController';

const router = Router();

router.get('/', getApartments);
router.get('/:id', getApartmentById);

export default router;