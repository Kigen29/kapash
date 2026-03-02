// booking.routes.ts
import { Router } from 'express';
import { createBooking, getMyBookings, getBooking, cancelBooking } from '../controllers/booking.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);
router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:id', getBooking);
router.post('/:id/cancel', cancelBooking);

export default router;