import { z } from 'zod';
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
} from '../types/domain.js';
import { cleanText, objectId, pageQuery } from './common.js';

const maxYear = new Date().getFullYear() + 1;

/** Optional text that may be cleared by sending `null` or an empty string. */
const optionalText = (max: number) =>
  z
    .union([cleanText(max), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : v));

/** Maps "Foreign used", "foreign-used" etc. onto the known key; anything else is kept as typed. */
export function normalizeChoice(values: readonly string[], raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return values.includes(key) ? key : raw.trim();
}

/** One of the known values or the staff member's own wording; `null`/`''` clears it. */
const optionalChoice = (values: readonly string[], max = 40) =>
  z
    .union([cleanText(max), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : typeof v === 'string' ? normalizeChoice(values, v) : v));

const vehicleFields = {
  make: cleanText(40).pipe(z.string().min(1, 'Make is required.')),
  model: cleanText(60).pipe(z.string().min(1, 'Model is required.')),
  trim: optionalText(60),
  /** 17-character VIN, or a shorter Japanese chassis number such as "NZE141-1234567". */
  vin: z
    .union([cleanText(30).pipe(z.string().regex(/^[A-Za-z0-9\- ]*$/, 'Use letters, numbers and dashes only.')), z.null()])
    .optional()
    .transform((v) => (v === '' ? null : typeof v === 'string' ? v.toUpperCase() : v)),
  year: z.coerce.number().int().min(1950, 'Year looks too early.').max(maxYear, `Year cannot be after ${maxYear}.`),
  price: z.coerce.number().min(0, 'Price cannot be negative.').max(1_000_000_000),
  currency: z.enum(CURRENCIES),
  condition: optionalChoice(CONDITIONS),
  availabilityStatus: z.enum(AVAILABILITY),
  visibility: z.enum(VISIBILITY),
  bodyType: optionalChoice(BODY_TYPES),
  mileage: z.union([z.coerce.number().int().min(0).max(5_000_000), z.null()]).optional(),
  mileageUnit: optionalEnum(MILEAGE_UNITS),
  engineSize: optionalText(30),
  fuelType: optionalChoice(FUEL_TYPES),
  transmission: optionalChoice(TRANSMISSIONS),
  drivetrain: optionalChoice(DRIVETRAINS),
  exteriorColor: optionalText(40),
  interiorColor: optionalText(40),
  description: optionalText(5000),
  features: z
    .array(cleanText(80).pipe(z.string().min(1)))
    .max(80)
    .transform((list) => [...new Set(list)])
    .optional(),
  knownDefects: optionalText(2000),
  conditionNotes: optionalText(2000),
  location: optionalText(120),
};

export const createVehicleSchema = z.object({
  ...vehicleFields,
  availabilityStatus: vehicleFields.availabilityStatus.default('available'),
  visibility: vehicleFields.visibility.default('draft'),
  currency: vehicleFields.currency.default('GHS'),
});

export const updateVehicleSchema = z
  .object(vehicleFields)
  .partial()
  .extend({
    /** Version the client last saw; rejects the update if someone else saved in between. */
    version: z.number().int().min(0),
  });

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;

const csvOrSingle = z.string().max(40).optional();

export const publicVehicleQuery = z.object({
  q: z.string().trim().max(60).optional(),
  make: csvOrSingle,
  bodyType: z.string().trim().max(40).optional(),
  fuelType: z.string().trim().max(40).optional(),
  transmission: z.string().trim().max(40).optional(),
  condition: z.string().trim().max(40).optional(),
  availability: z.enum(['in_stock', 'available', 'reserved', 'sold', 'all']).default('in_stock'),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  /** Currency the visitor typed min/max in; defaults to the dealership's default currency. */
  priceCurrency: z.enum(CURRENCIES).optional(),
  minYear: z.coerce.number().int().min(1900).max(2100).optional(),
  maxYear: z.coerce.number().int().min(1900).max(2100).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  ...pageQuery,
});
export type PublicVehicleQuery = z.infer<typeof publicVehicleQuery>;

export const adminVehicleQuery = z.object({
  q: z.string().trim().max(60).optional(),
  availability: z.enum(AVAILABILITY).optional(),
  visibility: z.enum(VISIBILITY).optional(),
  sort: z.enum(['updated', 'newest', 'price_asc', 'price_desc']).default('updated'),
  ...pageQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminVehicleQuery = z.infer<typeof adminVehicleQuery>;

export const slugParams = z.object({ slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/) });

export const imageParams = z.object({ id: objectId, imageId: objectId });

export const reorderImagesSchema = z.object({ imageIds: z.array(objectId).min(1).max(100) });

export const updateImageSchema = z.object({ alt: cleanText(200) });
