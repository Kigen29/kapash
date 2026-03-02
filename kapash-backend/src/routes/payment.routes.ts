import { Router } from 'express';
import { initiatePayment, mpesaCallback, checkPaymentStatus } from '../controllers/payment.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// Authenticated routes
router.post('/mpesa/initiate', authenticate, initiatePayment);
router.get('/:bookingId/status', authenticate, checkPaymentStatus);

// M-Pesa callback — called by Safaricom servers (no auth)
router.post('/mpesa/callback', mpesaCallback);

export default router;