import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { sanitizeInput, preventHPP } from './middleware/sanitize';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import pitchRoutes from './routes/pitch.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import ownerRoutes from './routes/owner.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';

const app: Application = express();

// ── Trust proxy (needed for rate limiting behind load balancer) ───────────────
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com', '*.cloudinary.com'],
      connectSrc: ["'self'", 'api.safaricom.co.ke', 'sandbox.safaricom.co.ke'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Expo / RN requests
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = env.NODE_ENV === 'development'
  ? true // Allow all in dev (React Native uses local IP)
  : [env.FRONTEND_URL, 'https://kapash.co.ke', 'https://app.kapash.co.ke'];

app.use(cors({
  origin: allowedOrigins,
  credentials: env.NODE_ENV !== 'development',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400, // Cache preflight for 24h
}));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  skip: (req) => req.path.includes('/health'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
  keyGenerator: (req) => req.ip + (req.body?.phone || ''),
});

const bookingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,                    // Max 5 bookings per 10 min (anti-referral fraud)
  message: { success: false, message: 'Too many booking attempts. Please slow down.' },
});

app.use('/api', globalLimiter);
app.use(`/api/${env.API_VERSION}/auth`, authLimiter);
app.use(`/api/${env.API_VERSION}/bookings`, (req, res, next) => {
  if (req.method === 'POST') return bookingLimiter(req, res, next);
  next();
});

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/payments/mpesa/callback')) {
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json({ limit: '5mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(compression());

// ── Input Sanitization ────────────────────────────────────────────────────────
app.use(sanitizeInput);
app.use(preventHPP);

// ── Request ID ────────────────────────────────────────────────────────────────
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  next();
});

// ── Logging ───────────────────────────────────────────────────────────────────
if (env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === '/health',
  }));
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Kapash API',
    version: env.API_VERSION,
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
const apiPrefix = `/api/${env.API_VERSION}`;

app.use(`${apiPrefix}/auth`,          authRoutes);
app.use(`${apiPrefix}/users`,         userRoutes);
app.use(`${apiPrefix}/pitches`,       pitchRoutes);
app.use(`${apiPrefix}/bookings`,      bookingRoutes);
app.use(`${apiPrefix}/payments`,      paymentRoutes);
app.use(`${apiPrefix}/reviews`,       reviewRoutes);
app.use(`${apiPrefix}/owner`,         ownerRoutes);
app.use(`${apiPrefix}/admin`,         adminRoutes);
app.use(`${apiPrefix}/notifications`, notificationRoutes);

// ── Error Handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;