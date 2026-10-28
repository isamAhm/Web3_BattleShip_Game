import { postMatchProcessor } from './postMatchWorker.js';
import { connectMongo, closeMongo } from '../services/mongo.js';
import { redisService } from '../services/redis.js';

async function startWorker() {
  console.log('[Worker] Starting post-match processor worker...');
  await connectMongo();

  const shutdown = async () => {
    console.log('[Worker] Shutting down worker...');
    await postMatchProcessor.close();
    await redisService.close();
    await closeMongo();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});
