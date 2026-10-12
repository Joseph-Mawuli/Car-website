import { Schema, model, type Types } from 'mongoose';
import { ROLES, type Role } from '../lib/permissions.js';
import { STAFF_STATUSES, type StaffStatus } from '../types/domain.js';

export interface StaffRecord {
  firebaseUid: string;
  email: string;
  displayName: string;
  role: Role;
  status: StaffStatus;
  invitedBy?: Types.ObjectId;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const staffSchema = new Schema<StaffRecord>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: ROLES, required: true },
    status: { type: String, enum: STAFF_STATUSES, default: 'active', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

staffSchema.index({ role: 1, status: 1 });

export const Staff = model<StaffRecord>('Staff', staffSchema);
