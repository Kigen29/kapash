import { Router } from 'express';
import { sendOtp, verifyOtp, refreshToken, logout } from '../controllers/auth.controller';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { Response } from 'express';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Session restore — called by AuthContext on app launch
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, name: true, phone: true, email: true,
      avatar: true, role: true, referralCode: true, isVerified: true,
    },
  });
  res.json({ success: true, data: { user } });
});

export default router;