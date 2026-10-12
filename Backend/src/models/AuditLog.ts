import { Schema, model, type Types } from 'mongoose';

export interface AuditLogRecord {
  actor?: Types.ObjectId;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  /** Human-readable summary. Must never contain passwords, tokens or other secrets. */
  summary?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogRecord>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'Staff' },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, maxlength: 60 },
    targetType: { type: String, maxlength: 40 },
    targetId: { type: String, maxlength: 60 },
    summary: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<AuditLogRecord>('AuditLog', auditLogSchema);
