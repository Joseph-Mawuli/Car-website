import { activeStorageDriver, env, isFirebaseConfigured, publicApiUrl } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './lib/db.js';
import { verifyFirebaseIdToken } from './lib/firebase.js';
import { findStaffByUid } from './services/staffService.js';
import { getLiveRates } from './services/liveRates.js';
import { getSettingsRecord } from './services/settingsService.js';

async function main() {
  if (!isFirebaseConfigured) logger.warn('Firebase Admin is not configured: admin sign-in will return 503 until FIREBASE_* variables are set.');
  if (activeStorageDriver === 'mongodb') {
    logger.info(`Photos are stored in MongoDB (GridFS) and served from ${publicApiUrl}/api/v1/media. Switch to Cloudflare R2 before your inventory grows.`);
  } else if (!activeStorageDriver) {
    logger.warn('Photo storage is not configured: uploads will return 503 until R2_* variables are set (or STORAGE_DRIVER=mongodb).');
  }

  const app = createApp({
    auth: { verifyIdToken: verifyFirebaseIdToken, findStaffByUid },
    isDatabaseReady: isDatabaseConnected,
  });

  const server = app.listen(env.PORT, () => logger.info(`Goddel Motors API listening on port ${env.PORT}`));

  try {
    await connectDatabase();
    void getLiveRates((await getSettingsRecord()).defaultCurrency);
  } catch (error) {
    logger.error('Could not connect to MongoDB. The API will respond with 503 until the database is reachable.', { error });
  }

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => {
      disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error('Fatal startup error', { error });
  process.exit(1);
});
