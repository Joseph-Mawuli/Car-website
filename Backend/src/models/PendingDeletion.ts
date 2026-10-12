import { Schema, model } from 'mongoose';
import type { StorageSource } from '../services/storage.js';

/** Storage objects whose deletion failed; retried by `npm run cleanup:orphans`. */
export interface PendingDeletionRecord {
  key: string;
  source: StorageSource;
  reason: string;
  attempts: number;
  createdAt: Date;
  updatedAt: Date;
}

const pendingDeletionSchema = new Schema<PendingDeletionRecord>(
  {
    key: { type: String, required: true, unique: true },
    source: { type: String, enum: ['r2', 'mongodb'], default: 'r2' },
    reason: { type: String, required: true, maxlength: 200 },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const PendingDeletion = model<PendingDeletionRecord>('PendingDeletion', pendingDeletionSchema);
