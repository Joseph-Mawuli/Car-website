import { Schema, model } from 'mongoose';
import { CURRENCIES, EXCHANGE_RATE_MODES, type CurrencyCode, type ExchangeRateMode } from '../types/domain.js';

export interface SiteSettingsRecord {
  key: 'site';
  dealershipName: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  openingHours: { label: string; hours: string }[];
  socialLinks: { label: string; url: string }[];
  defaultCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  /** `live`: daily market rates fetched automatically. `manual`: the owner's own rates below. */
  exchangeRateMode: ExchangeRateMode;
  exchangeRates?: {
    base: CurrencyCode;
    rates: Map<string, number>;
    updatedAt?: Date;
    source?: string;
  };
  aboutHeading?: string;
  aboutBody?: string;
  whyChooseUs: { title: string; body: string }[];
  privacyNotice?: string;
  updatedAt: Date;
  createdAt: Date;
}

const siteSettingsSchema = new Schema<SiteSettingsRecord>(
  {
    key: { type: String, required: true, unique: true, default: 'site' },
    dealershipName: { type: String, required: true, default: 'Goddel Motors', maxlength: 80 },
    tagline: { type: String, maxlength: 200 },
    phone: { type: String, maxlength: 30 },
    whatsapp: { type: String, maxlength: 30 },
    email: { type: String, maxlength: 120 },
    address: { type: String, maxlength: 300 },
    mapUrl: { type: String, maxlength: 500 },
    openingHours: { type: [{ _id: false, label: String, hours: String }], default: [] },
    socialLinks: { type: [{ _id: false, label: String, url: String }], default: [] },
    defaultCurrency: { type: String, enum: CURRENCIES, default: 'GHS' },
    supportedCurrencies: { type: [String], enum: CURRENCIES, default: [...CURRENCIES] },
    exchangeRateMode: { type: String, enum: EXCHANGE_RATE_MODES, default: 'live' },
    exchangeRates: {
      base: { type: String, enum: CURRENCIES },
      rates: { type: Map, of: Number },
      updatedAt: Date,
      source: { type: String, maxlength: 120 },
    },
    aboutHeading: { type: String, maxlength: 120 },
    aboutBody: { type: String, maxlength: 4000 },
    whyChooseUs: { type: [{ _id: false, title: String, body: String }], default: [] },
    privacyNotice: { type: String, maxlength: 4000 },
  },
  { timestamps: true },
);

export const SiteSettings = model<SiteSettingsRecord>('SiteSettings', siteSettingsSchema);
