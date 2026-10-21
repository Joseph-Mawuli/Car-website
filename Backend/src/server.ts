import { activeStorageDriver, env, isFirebaseConfigured, publicApiUrl } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './lib/db.js';
import { verifyFirebaseIdToken } from './lib/firebase.js';
import { findStaffByUid } from './services/staffService.js';
import { getLiveRates } from './services/liveRates.js';
import { getSettingsRecord } from './services/settingsService.js';
import { DEFAULT_ENQUIRY_RETENTION_MONTHS, purgeExpiredEnquiries } from './services/enquiryService.js';

const RETENTION_CHECK_MS = 12 * 60 * 60 * 1000;

/** Runs at startup (the free host sleeps, so this covers most days) and then twice a day. */
function startEnquiryRetention() {
  const run = async () => {
    try {
      const settings = await getSettingsRecord();
      await purgeExpiredEnquiries(settings.enquiryRetentionMonths ?? DEFAULT_ENQUIRY_RETENTION_MONTHS);
    } catch (error) {
      logger.error('Enquiry retention clean-up failed', { error });
    }
  };
  void run();
  setInterval(() => void run(), RETENTION_CHECK_MS).unref();
}

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

  // Keep retrying: a database that is unreachable at boot (e.g. IP allowlist not yet updated) must not
  // leave the API disconnected until someone restarts it.
  const connectWithRetry = async (attempt = 1): Promise<void> => {
    try {
      await connectDatabase();
      void getLiveRates((await getSettingsRecord()).defaultCurrency);
      startEnquiryRetention();
    } catch (error) {
      const delayMs = Math.min(60_000, 5_000 * attempt);
      logger.error(`Could not connect to MongoDB (attempt ${attempt}); retrying in ${delayMs / 1000}s. The API responds with 503 until then.`, {
        error,
      });
      setTimeout(() => void connectWithRetry(attempt + 1), delayMs).unref();
    }
  };
  await connectWithRetry();

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
