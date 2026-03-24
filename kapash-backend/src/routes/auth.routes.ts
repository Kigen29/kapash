import { Router } from 'express';
import {
  sendOtp, verifyOtp, refreshToken, logout,
  socialLogin, sendPhoneLinkOtp, verifyPhoneLink,
} from '../controllers/auth.controller';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { Response } from 'express';

const router = Router();

// Phone OTP auth
router.post('/send-otp',    sendOtp);
router.post('/verify-otp',  verifyOtp);

// Social auth
router.post('/social',      socialLogin);

// Phone linking (for social auth users — requires auth token)
router.post('/link-phone/send',   authenticate, sendPhoneLinkOtp);
router.post('/link-phone/verify', authenticate, verifyPhoneLink);

// Token management
router.post('/refresh', refreshToken);
router.post('/logout',  logout);

// Session restore
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, referralCode: true,
      isVerified: true, phoneVerified: true, walletBalance: true,
    },
  });
  res.json({ success: true, data: user });
});

export default router;