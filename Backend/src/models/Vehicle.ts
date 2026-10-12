import { Schema, model, type Types, type HydratedDocument } from 'mongoose';
import {
  AVAILABILITY,
  BODY_TYPES,
  CONDITIONS,
  CURRENCIES,
  DRIVETRAINS,
  FUEL_TYPES,
  MILEAGE_UNITS,
  TRANSMISSIONS,
  VISIBILITY,
  type AvailabilityStatus,
  type BodyType,
  type CurrencyCode,
  type Drivetrain,
  type FuelType,
  type MileageUnit,
  type Transmission,
  type VehicleCondition,
  type Visibility,
} from '../types/domain.js';

export interface ImageVariantRecord {
  key: string;
  url: string;
  width: number;
  height: number;
}

export interface VehicleImageRecord {
  _id: Types.ObjectId;
  /** Object key of the sanitised full-resolution original in R2. */
  key: string;
  url: string;
  alt: string;
  sortOrder: number;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  variants: { thumb?: ImageVariantRecord; medium?: ImageVariantRecord; large?: ImageVariantRecord };
  /** Where the files live: R2, MongoDB GridFS, or `static` (demo seed, served by the frontend and never deleted). */
  source: 'r2' | 'mongodb' | 'static';
  uploadedAt: Date;
  uploadedBy?: Types.ObjectId;
}

export interface VehicleRecord {
  slug: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  price: number;
  currency: CurrencyCode;
  condition?: VehicleCondition;
  availabilityStatus: AvailabilityStatus;
  visibility: Visibility;
  bodyType?: BodyType;
  mileage?: number;
  mileageUnit?: MileageUnit;
  engineSize?: string;
  fuelType?: FuelType;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  exteriorColor?: string;
  interiorColor?: string;
  description?: string;
  features: string[];
  knownDefects?: string;
  conditionNotes?: string;
  location?: string;
  images: VehicleImageRecord[];
  isDemo: boolean;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

const variantSchema = new Schema<ImageVariantRecord>(
  { key: { type: String, required: true }, url: { type: String, required: true }, width: Number, height: Number },
  { _id: false },
);

const imageSchema = new Schema<VehicleImageRecord>({
  key: { type: String, required: true },
  url: { type: String, required: true },
  alt: { type: String, default: '', maxlength: 200 },
  sortOrder: { type: Number, required: true, min: 0 },
  width: Number,
  height: Number,
  size: Number,
  mimeType: String,
  variants: {
    thumb: variantSchema,
    medium: variantSchema,
    large: variantSchema,
  },
  source: { type: String, enum: ['r2', 'mongodb', 'static'], default: 'r2' },
  uploadedAt: { type: Date, default: () => new Date() },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
});

const vehicleSchema = new Schema<VehicleRecord>(
  {
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    make: { type: String, required: true, trim: true, maxlength: 40 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    trim: { type: String, trim: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1950, max: 2100 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: CURRENCIES, required: true, default: 'GHS' },
    condition: { type: String, enum: CONDITIONS },
    availabilityStatus: { type: String, enum: AVAILABILITY, required: true, default: 'available' },
    visibility: { type: String, enum: VISIBILITY, required: true, default: 'draft' },
    bodyType: { type: String, enum: BODY_TYPES },
    mileage: { type: Number, min: 0 },
    mileageUnit: { type: String, enum: MILEAGE_UNITS },
    engineSize: { type: String, trim: true, maxlength: 30 },
    fuelType: { type: String, enum: FUEL_TYPES },
    transmission: { type: String, enum: TRANSMISSIONS },
    drivetrain: { type: String, enum: DRIVETRAINS },
    exteriorColor: { type: String, trim: true, maxlength: 40 },
    interiorColor: { type: String, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 5000 },
    features: { type: [String], default: [] },
    knownDefects: { type: String, trim: true, maxlength: 2000 },
    conditionNotes: { type: String, trim: true, maxlength: 2000 },
    location: { type: String, trim: true, maxlength: 120 },
    images: { type: [imageSchema], default: [] },
    isDemo: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Staff' },
  },
  { timestamps: true, versionKey: '__v' },
);

// Public catalogue: visibility + availability filter, newest/price sorting.
vehicleSchema.index({ visibility: 1, availabilityStatus: 1, createdAt: -1 });
vehicleSchema.index({ visibility: 1, availabilityStatus: 1, price: 1 });
vehicleSchema.index({ visibility: 1, make: 1, model: 1 });
vehicleSchema.index({ visibility: 1, bodyType: 1 });
vehicleSchema.index({ updatedAt: -1 });

export const Vehicle = model<VehicleRecord>('Vehicle', vehicleSchema);
export type VehicleDoc = HydratedDocument<VehicleRecord>;
