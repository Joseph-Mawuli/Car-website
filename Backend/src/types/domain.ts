export const AVAILABILITY = ['available', 'reserved', 'sold'] as const;
export const VISIBILITY = ['published', 'draft', 'archived'] as const;
export const CONDITIONS = ['new', 'foreign_used', 'locally_used', 'certified_pre_owned'] as const;
export const FUEL_TYPES = ['petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'other'] as const;
export const TRANSMISSIONS = ['automatic', 'manual', 'cvt', 'dual_clutch', 'other'] as const;
export const DRIVETRAINS = ['fwd', 'rwd', 'awd', '4wd'] as const;
export const MILEAGE_UNITS = ['km', 'mi'] as const;
export const BODY_TYPES = ['suv', 'sedan', 'hatchback', 'pickup', 'coupe', 'convertible', 'wagon', 'van', 'minibus', 'crossover', 'other'] as const;
/** Keep in sync with `CURRENCIES` in frontend/src/types/index.ts. */
export const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'CAD', 'NGN', 'CNY', 'AED'] as const;
export const EXCHANGE_RATE_MODES = ['live', 'manual'] as const;
export const ENQUIRY_STATUSES = ['new', 'contacted', 'follow_up', 'closed'] as const;
export const PREFERRED_CONTACT = ['whatsapp', 'call', 'email'] as const;
export const STAFF_STATUSES = ['active', 'disabled'] as const;

/** A known key, or the wording staff typed when none of the known values fit. */
export type Choice<T extends string> = T | (string & {});

export type AvailabilityStatus = (typeof AVAILABILITY)[number];
export type Visibility = (typeof VISIBILITY)[number];
export type VehicleCondition = (typeof CONDITIONS)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type Transmission = (typeof TRANSMISSIONS)[number];
export type Drivetrain = (typeof DRIVETRAINS)[number];
export type MileageUnit = (typeof MILEAGE_UNITS)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type CurrencyCode = (typeof CURRENCIES)[number];
export type ExchangeRateMode = (typeof EXCHANGE_RATE_MODES)[number];
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export type PreferredContact = (typeof PREFERRED_CONTACT)[number];
export type StaffStatus = (typeof STAFF_STATUSES)[number];
