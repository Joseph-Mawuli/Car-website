import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

mongoose.set('strictQuery', true);
// Fail fast instead of buffering queries forever when the database is unreachable.
mongoose.set('bufferTimeoutMS', 8000);

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add your MongoDB Atlas connection string to Backend/.env');
  }
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    autoIndex: env.NODE_ENV !== 'production',
  });
  logger.info('Connected to MongoDB');
}

export async function syncIndexes(): Promise<void> {
  const models = Object.values(mongoose.models);
  for (const m of models) await m.syncIndexes();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
