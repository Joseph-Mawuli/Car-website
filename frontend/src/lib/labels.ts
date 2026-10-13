import type {
  AvailabilityStatus,
  BodyType,
  Drivetrain,
  EnquiryStatus,
  FuelType,
  StaffRole,
  Transmission,
  VehicleCondition,
  Visibility,
} from '@/types';

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  suv: 'SUV',
  sedan: 'Sedan',
  hatchback: 'Hatchback',
  pickup: 'Pickup',
  coupe: 'Coupe',
  convertible: 'Convertible',
  wagon: 'Wagon',
  van: 'Van',
  minibus: 'Minibus',
  crossover: 'Crossover',
  other: 'Other',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  plug_in_hybrid: 'Plug-in hybrid',
  electric: 'Electric',
  lpg: 'LPG',
  other: 'Other',
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
  cvt: 'CVT',
  dual_clutch: 'Dual-clutch',
  other: 'Other',
};

export const DRIVETRAIN_LABELS: Record<Drivetrain, string> = {
  fwd: 'Front-wheel drive',
  rwd: 'Rear-wheel drive',
  awd: 'All-wheel drive',
  '4wd': 'Four-wheel drive',
};

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  new: 'Brand new',
  foreign_used: 'Foreign used',
  locally_used: 'Locally used',
  certified_pre_owned: 'Certified pre-owned',
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  published: 'Published',
  draft: 'Draft',
  archived: 'Archived',
};

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  follow_up: 'Follow-up',
  closed: 'Closed',
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Owner',
  inventory_manager: 'Inventory Manager',
  sales_assistant: 'Sales Assistant',
};

export function optionsFrom<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

/** Known values show their label; wording staff typed themselves is shown as entered. */
export function labelOf(labels: Record<string, string>, value: string): string;
export function labelOf(labels: Record<string, string>, value: string | undefined): string | undefined;
export function labelOf(labels: Record<string, string>, value: string | undefined): string | undefined {
  if (!value) return undefined;
  return Object.hasOwn(labels, value) ? labels[value] : value;
}

/** Turns typed text into a known key when it matches one (by key or label), otherwise keeps the text. */
export function choiceFromText(labels: Record<string, string>, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  if (Object.hasOwn(labels, key)) return key;
  const byLabel = Object.keys(labels).find((k) => labels[k].toLowerCase() === trimmed.toLowerCase());
  return byLabel ?? trimmed;
}
