export type AvailabilityStatus = 'available' | 'reserved' | 'sold';
export type Visibility = 'published' | 'draft' | 'archived';
export type VehicleCondition = 'new' | 'foreign_used' | 'locally_used' | 'certified_pre_owned';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'plug_in_hybrid' | 'electric' | 'lpg' | 'other';
export type Transmission = 'automatic' | 'manual' | 'cvt' | 'dual_clutch' | 'other';
export type Drivetrain = 'fwd' | 'rwd' | 'awd' | '4wd';
export type MileageUnit = 'km' | 'mi';
export type BodyType =
  | 'suv'
  | 'sedan'
  | 'hatchback'
  | 'pickup'
  | 'coupe'
  | 'convertible'
  | 'wagon'
  | 'van'
  | 'minibus'
  | 'crossover'
  | 'other';

/** Keep in sync with `CURRENCIES` in Backend/src/types/domain.ts. */
export const CURRENCIES = ['GHS', 'USD', 'EUR', 'GBP', 'CAD', 'NGN', 'CNY', 'AED'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_NAMES: Record<CurrencyCode, string> = {
  GHS: 'Ghanaian cedi',
  USD: 'US dollar',
  EUR: 'Euro',
  GBP: 'British pound',
  CAD: 'Canadian dollar',
  NGN: 'Nigerian naira',
  CNY: 'Chinese yuan',
  AED: 'UAE dirham',
};

export interface ImageVariant {
  url: string;
  width: number;
  height: number;
}

export interface VehicleImage {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  width?: number;
  height?: number;
  variants?: {
    thumb?: ImageVariant;
    medium?: ImageVariant;
    large?: ImageVariant;
  };
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface VehicleSummary {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  trim?: string;
  year: number;
  price: number;
  currency: CurrencyCode;
  condition?: VehicleCondition;
  availabilityStatus: AvailabilityStatus;
  bodyType?: BodyType;
  mileage?: number;
  mileageUnit?: MileageUnit;
  fuelType?: FuelType;
  transmission?: Transmission;
  location?: string;
  isDemo?: boolean;
  primaryImage?: VehicleImage;
  createdAt: string;
}

export interface Vehicle extends VehicleSummary {
  engineSize?: string;
  drivetrain?: Drivetrain;
  exteriorColor?: string;
  interiorColor?: string;
  description?: string;
  features: string[];
  knownDefects?: string;
  conditionNotes?: string;
  images: VehicleImage[];
  updatedAt: string;
}

export interface AdminVehicle extends Vehicle {
  visibility: Visibility;
  version: number;
  createdBy?: { id: string; name: string };
  updatedBy?: { id: string; name: string };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VehicleFacets {
  makes: string[];
  bodyTypes: BodyType[];
  fuelTypes: FuelType[];
  transmissions: Transmission[];
  conditions: VehicleCondition[];
  years: { min: number | null; max: number | null };
  price: { min: number | null; max: number | null };
}

export interface VehicleDetailResponse {
  vehicle: Vehicle;
  related: VehicleSummary[];
}

export interface ExchangeRates {
  base: CurrencyCode;
  /** 1 unit of `base` equals `rates[code]` units of `code`. */
  rates: Partial<Record<CurrencyCode, number>>;
  updatedAt?: string;
  source?: string;
  /** Set for live market rates; the provider's terms require a visible link. */
  sourceUrl?: string;
}

export type ExchangeRateMode = 'live' | 'manual';

export interface OpeningHoursEntry {
  label: string;
  hours: string;
}

export interface PublicSettings {
  dealershipName: string;
  /** Short line shown under the logo. */
  motto?: string;
  /** Uploaded logo; the built-in emblem is shown when absent. */
  logoUrl?: string;
  /** The uploaded logo already shows the business name, so it isn't repeated beside it. */
  logoIncludesName?: boolean;
  phone?: string;
  /** Extra numbers shown alongside the main phone. */
  additionalPhones?: string[];
  whatsapp?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  openingHours: OpeningHoursEntry[];
  socialLinks: { label: string; url: string }[];
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  exchangeRateMode: ExchangeRateMode;
  /** The rates estimates and price filters use (live or the owner's own). */
  exchangeRates?: ExchangeRates;
  aboutHeading?: string;
  aboutBody?: string;
  whyChooseUs: { title: string; body: string }[];
  privacyNotice?: string;
}

export type EnquiryStatus = 'new' | 'contacted' | 'follow_up' | 'closed';
export type PreferredContact = 'whatsapp' | 'call' | 'email';

export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  message: string;
  vehicleId?: string;
  preferredContact?: PreferredContact;
  consent: boolean;
  website?: string;
  startedAt?: number;
}

export interface EnquiryNote {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
  preferredContact?: PreferredContact;
  status: EnquiryStatus;
  vehicle?: { id: string; title: string; slug: string };
  assignedTo?: { id: string; name: string };
  notes: EnquiryNote[];
  createdAt: string;
  updatedAt: string;
}

export type StaffRole = 'owner' | 'inventory_manager' | 'sales_assistant';
export type StaffStatus = 'active' | 'disabled';

export type Permission =
  | 'dashboard:read'
  | 'vehicles:read'
  | 'vehicles:write'
  | 'vehicles:images'
  | 'vehicles:archive'
  | 'vehicles:delete'
  | 'enquiries:read'
  | 'enquiries:update'
  | 'enquiries:assign'
  | 'staff:manage'
  | 'settings:manage'
  | 'audit:read';

export interface StaffMember {
  id: string;
  email: string;
  displayName: string;
  role: StaffRole;
  status: StaffStatus;
  lastLoginAt?: string;
  createdAt: string;
}

/** When `emailed` is true the link went straight to the staff member and is not returned. */
export interface SetupLinkDelivery {
  method: 'smtp' | 'firebase' | 'manual';
  emailed: boolean;
  setupLink?: string;
  notice?: string;
}

export interface CurrentStaff extends StaffMember {
  permissions: Permission[];
}

export interface DashboardSummary {
  vehicles: { total: number; available: number; reserved: number; sold: number; draft: number; archived: number };
  enquiries?: { new: number; total: number };
  recentVehicles: { id: string; title: string; updatedAt: string; availabilityStatus: AvailabilityStatus; visibility: Visibility }[];
  recentEnquiries?: Pick<Enquiry, 'id' | 'name' | 'status' | 'createdAt' | 'vehicle'>[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorEmail: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  createdAt: string;
}

export interface AdminSettings extends PublicSettings {
  updatedAt?: string;
  /** Today's market rates, shown for comparison. `exchangeRates` here holds the owner's own rates. */
  liveExchangeRates?: ExchangeRates;
}
