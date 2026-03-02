import 'express-async-errors';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';
import { startCronJobs } from './jobs';

const PORT = env.PORT;

async function bootstrap() {
  try {
    // Connect to PostgreSQL
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Start background jobs
    startCronJobs();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════╗
║        KAPASH API SERVER              ║
║   Environment: ${env.NODE_ENV.padEnd(22)}║
║   Port:        ${String(PORT).padEnd(22)}║
║   API:         /api/${env.API_VERSION.padEnd(20)}║
╚═══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

bootstrap();