import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { AppError } from '../utils/errors';
import prisma from '../config/database';
import { UserRole, AdminTier } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    phone: string;
    name: string;
    adminTier?: AdminTier | null;
    corporateId?: string | null;
    isCorpAdmin?: boolean;
  };
}

// ── Authenticate ──────────────────────────────────────────────────────────────

export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required.', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const { userId, role } = verifyAccessToken(token);

    // Fetch user to ensure still active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, role: true, phone: true, name: true, isActive: true,
        adminTier: true, corporateId: true, isCorpAdmin: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError('Account not found or deactivated.', 401));
    }

    req.user = {
      id: user.id,
      role: user.role,
      phone: user.phone,
      name: user.name,
      adminTier: user.adminTier,
      corporateId: user.corporateId,
      isCorpAdmin: user.isCorpAdmin,
    };
    next();
  } catch (error) {
    next(error);
  }
}

// ── Optional Auth (doesn't fail if no token) ──────────────────────────────────

export async function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const { userId } = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, phone: true, name: true },
    });
    if (user) req.user = user;
  } catch {}
  next();
}

// ── Role Guards ───────────────────────────────────────────────────────────────

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required.', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to do this.', 403));
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireOwner = requireRole('OWNER', 'ADMIN');
export const requireCustomer = requireRole('PLAYER', 'ADMIN');

/**
 * Require the authenticated admin to belong to one of the listed tiers.
 * SUPER admins always pass.
 * Usage: router.post('/things', authenticate, requireAdminTier('OPERATIONS', 'SUPER'), handler)
 */
export function requireAdminTier(...allowed: AdminTier[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Authentication required.', 401));
    if (req.user.role !== 'ADMIN') return next(new AppError('Admin only.', 403));
    if (req.user.adminTier === 'SUPER') return next();
    if (!req.user.adminTier || !allowed.includes(req.user.adminTier)) {
      return next(new AppError(`This action requires one of: ${allowed.join(', ')}.`, 403));
    }
    next();
  };
}

/**
 * Require the authenticated user to be a corporate admin (owner of their company account).
 */
export function requireCorporateAdmin(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('Authentication required.', 401));
  if (!req.user.corporateId || !req.user.isCorpAdmin) {
    return next(new AppError('Corporate admin only.', 403));
  }
  next();
}

/**
 * Require the authenticated user to belong to any corporate (admin or booker).
 */
export function requireCorporate(req: AuthRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('Authentication required.', 401));
  if (!req.user.corporateId) {
    return next(new AppError('Corporate account required.', 403));
  }
  next();
}