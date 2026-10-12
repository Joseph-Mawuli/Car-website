import type { Types } from 'mongoose';
import type { VehicleImageRecord, VehicleRecord } from '../models/Vehicle.js';
import type { EnquiryRecord } from '../models/Enquiry.js';
import type { StaffRecord } from '../models/Staff.js';
import { vehicleTitle } from '../lib/text.js';

type WithId<T> = T & { _id: Types.ObjectId };

function variant(v?: { url: string; width: number; height: number }) {
  return v ? { url: v.url, width: v.width, height: v.height } : undefined;
}

/** Storage object keys are internal and deliberately omitted from responses. */
export function serializeImage(img: VehicleImageRecord) {
  return {
    id: img._id.toString(),
    url: img.url,
    alt: img.alt ?? '',
    sortOrder: img.sortOrder,
    width: img.width,
    height: img.height,
    variants: {
      thumb: variant(img.variants?.thumb),
      medium: variant(img.variants?.medium),
      large: variant(img.variants?.large),
    },
    mimeType: img.mimeType,
    size: img.size,
    uploadedAt: img.uploadedAt?.toISOString(),
  };
}

function sortedImages(images: VehicleImageRecord[] = []) {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function serializeVehicleSummary(v: WithId<VehicleRecord>) {
  const primary = sortedImages(v.images)[0];
  return {
    id: v._id.toString(),
    slug: v.slug,
    title: vehicleTitle(v),
    make: v.make,
    model: v.model,
    trim: v.trim ?? undefined,
    year: v.year,
    price: v.price,
    currency: v.currency,
    condition: v.condition ?? undefined,
    availabilityStatus: v.availabilityStatus,
    bodyType: v.bodyType ?? undefined,
    mileage: v.mileage ?? undefined,
    mileageUnit: v.mileageUnit ?? undefined,
    fuelType: v.fuelType ?? undefined,
    transmission: v.transmission ?? undefined,
    location: v.location ?? undefined,
    isDemo: v.isDemo || undefined,
    primaryImage: primary ? serializeImage(primary) : undefined,
    createdAt: v.createdAt.toISOString(),
  };
}

export function serializeVehicle(v: WithId<VehicleRecord>) {
  return {
    ...serializeVehicleSummary(v),
    engineSize: v.engineSize ?? undefined,
    drivetrain: v.drivetrain ?? undefined,
    exteriorColor: v.exteriorColor ?? undefined,
    interiorColor: v.interiorColor ?? undefined,
    description: v.description ?? undefined,
    features: v.features ?? [],
    knownDefects: v.knownDefects ?? undefined,
    conditionNotes: v.conditionNotes ?? undefined,
    images: sortedImages(v.images).map(serializeImage),
    updatedAt: v.updatedAt.toISOString(),
  };
}

type PopulatedStaff = { _id: Types.ObjectId; displayName: string } | Types.ObjectId | undefined | null;

function staffRef(ref: PopulatedStaff) {
  if (!ref || !('displayName' in ref)) return undefined;
  return { id: ref._id.toString(), name: ref.displayName };
}

export function serializeAdminVehicle(v: WithId<VehicleRecord>) {
  return {
    ...serializeVehicle(v),
    visibility: v.visibility,
    version: v.__v ?? 0,
    createdBy: staffRef(v.createdBy as unknown as PopulatedStaff),
    updatedBy: staffRef(v.updatedBy as unknown as PopulatedStaff),
  };
}

export function serializeEnquiry(e: WithId<EnquiryRecord>) {
  return {
    id: e._id.toString(),
    name: e.name,
    phone: e.phone,
    email: e.email ?? undefined,
    message: e.message,
    preferredContact: e.preferredContact ?? undefined,
    status: e.status,
    vehicle:
      e.vehicle && e.vehicleSnapshot
        ? { id: e.vehicle.toString(), title: e.vehicleSnapshot.title, slug: e.vehicleSnapshot.slug }
        : undefined,
    assignedTo: staffRef(e.assignedTo as unknown as PopulatedStaff),
    notes: (e.notes ?? []).map((n) => ({
      id: n._id.toString(),
      body: n.body,
      authorName: n.authorName,
      createdAt: n.createdAt.toISOString(),
    })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeStaff(s: WithId<StaffRecord>) {
  return {
    id: s._id.toString(),
    email: s.email,
    displayName: s.displayName,
    role: s.role,
    status: s.status,
    lastLoginAt: s.lastLoginAt?.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}
