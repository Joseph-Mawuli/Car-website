import { Schema, model, type Types } from 'mongoose';
import { ENQUIRY_STATUSES, PREFERRED_CONTACT, type EnquiryStatus, type PreferredContact } from '../types/domain.js';

export interface EnquiryNoteRecord {
  _id: Types.ObjectId;
  body: string;
  author: Types.ObjectId;
  authorName: string;
  createdAt: Date;
}

export interface EnquiryRecord {
  vehicle?: Types.ObjectId;
  /** Copy of key listing details at the time of the enquiry, in case the vehicle is later edited or deleted. */
  vehicleSnapshot?: { title: string; slug: string; price: number; currency: string };
  name: string;
  phone: string;
  email?: string;
  message: string;
  preferredContact?: PreferredContact;
  consentAt: Date;
  status: EnquiryStatus;
  assignedTo?: Types.ObjectId;
  notes: EnquiryNoteRecord[];
  /** Salted hash — lets us spot abuse without storing raw IP addresses. */
  ipHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<EnquiryNoteRecord>({
  body: { type: String, required: true, maxlength: 2000 },
  author: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
});

const enquirySchema = new Schema<EnquiryRecord>(
  {
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    vehicleSnapshot: {
      title: String,
      slug: String,
      price: Number,
      currency: String,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 25 },
    email: { type: String, trim: true, lowercase: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    preferredContact: { type: String, enum: PREFERRED_CONTACT },
    consentAt: { type: Date, required: true },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Staff' },
    notes: { type: [noteSchema], default: [] },
    ipHash: { type: String, select: false },
  },
  { timestamps: true },
);

enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
enquirySchema.index({ phone: 1, createdAt: -1 });
enquirySchema.index({ ipHash: 1, createdAt: -1 });

export const Enquiry = model<EnquiryRecord>('Enquiry', enquirySchema);
