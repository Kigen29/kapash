import { Router } from 'express';
import { sendOtp, verifyOtp, refreshToken, logout } from '../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/send-otp
router.post('/send-otp', sendOtp);

// POST /api/v1/auth/verify-otp
router.post('/verify-otp', verifyOtp);

// POST /api/v1/auth/refresh
router.post('/refresh', refreshToken);

// POST /api/v1/auth/logout
router.post('/logout', logout);

export default router;