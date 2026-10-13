import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog.js';
import type { StaffPrincipal } from '../middleware/auth.js';
import { logger } from '../config/logger.js';
import { notFound } from '../lib/errors.js';

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
}

/** Never throws: an audit write failure must not break the user's action, but it is logged. */
export async function recordAudit(actor: StaffPrincipal, entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create({
      actor: new Types.ObjectId(actor.id),
      actorEmail: actor.email,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary?.slice(0, 500),
    });
  } catch (error) {
    logger.error('Failed to write audit log', { action: entry.action, error });
  }
}

export async function deleteAuditLog(id: string): Promise<void> {
  const res = await AuditLog.deleteOne({ _id: new Types.ObjectId(id) });
  if (res.deletedCount === 0) throw notFound('Audit entry not found.');
}

/** Removes every entry and returns how many were deleted. */
export async function clearAuditLogs(): Promise<number> {
  const res = await AuditLog.deleteMany({});
  return res.deletedCount;
}

export async function listAuditLogs(page: number, limit: number) {
  const [items, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(),
  ]);
  return {
    items: items.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      actorEmail: l.actorEmail,
      targetType: l.targetType,
      targetId: l.targetId,
      summary: l.summary,
      createdAt: l.createdAt.toISOString(),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
