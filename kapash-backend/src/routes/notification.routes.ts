import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import prisma from '../config/database';
import { AppError } from '../utils/errors';

const router = Router();
router.use(authenticate);

// GET /api/v1/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });

  res.json({ success: true, data: { notifications, unreadCount } });
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError('Notification not found.', 404);
  if (notification.userId !== req.user!.id) throw new AppError('Access denied.', 403);

  await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });

  res.json({ success: true, message: 'Notification marked as read.' });
});

// PATCH /api/v1/notifications/read-all
router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DELETE /api/v1/notifications/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new AppError('Notification not found.', 404);
  if (notification.userId !== req.user!.id) throw new AppError('Access denied.', 403);

  await prisma.notification.delete({ where: { id } });
  res.json({ success: true, message: 'Notification deleted.' });
});

export default router;