import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, closeMongo } from './services/mongo.js';
import { redisService } from './services/redis.js';
import { setupSocketServer } from './sockets/index.js';
import { postMatchProcessor } from './workers/postMatchWorker.js';

async function bootstrap() {
  console.log(`[Server] Starting Web3 Battle Arena server in ${env.NODE_ENV} mode...`);

  // Connect to databases
  await connectMongo();

  const app = createApp();
  const httpServer = http.createServer(app);

  // Setup Socket.IO
  const io = setupSocketServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`[Server] HTTP and Socket.IO server listening on port ${env.PORT}`);
    console.log(`[Server] API Origin: ${env.API_ORIGIN}`);
    console.log(`[Server] Chain Mode: ${env.CHAIN_MODE}`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      io.close(() => {
        console.log('[Server] Socket.IO server closed.');
      });

      await postMatchProcessor.close();
      await redisService.close();
      await closeMongo();

      console.log('[Server] All services shut down cleanly. Exiting.');
      process.exit(0);
    });

    // Force exit after 10s timeout
    setTimeout(() => {
      console.error('[Server] Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
