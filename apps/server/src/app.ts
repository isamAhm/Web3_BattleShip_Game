import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimit.js';
import { correlationId } from './middleware/correlationId.js';
import { isMongoConnected } from './services/mongo.js';
import { redisService } from './services/redis.js';

// Route imports
import { authRouter } from './modules/auth/routes.js';
import { playersRouter } from './modules/players/routes.js';
import { matchesRouter } from './modules/matches/routes.js';
import { leaderboardRouter } from './modules/leaderboard/routes.js';
import { socialRouter } from './modules/social/routes.js';
import { notificationsRouter } from './modules/notifications/routes.js';
import { rewardsRouter } from './modules/rewards/routes.js';
import { tournamentsRouter } from './modules/tournaments/routes.js';

export function createApp(): Express {
  const app = express();

  // Basic security and parsing
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN || true,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationId);
  app.use(authenticate);

  // Health and Readiness
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', (req, res) => {
    const mongoReady = isMongoConnected();
    const redisReady = redisService.isReady();

    res.json({
      status: mongoReady && redisReady ? 'ready' : 'degraded',
      services: {
        mongodb: mongoReady ? 'connected' : 'memory_fallback',
        redis: redisReady ? 'connected' : 'memory_fallback',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Apply rate limiter to /api
  app.use('/api', apiRateLimiter);

  // Mount routers
  app.use('/api/auth', authRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/matches', matchesRouter);
  app.use('/api/leaderboards', leaderboardRouter);
  app.use('/api', socialRouter); // mounts /api/friends and /api/invites
  app.use('/api/notifications', notificationsRouter);
  app.use('/api', rewardsRouter); // mounts /api/rewards and /api/badges
  app.use('/api/tournaments', tournamentsRouter);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
