import { z } from 'zod';
import { CURRENCIES, EXCHANGE_RATE_MODES } from '../types/domain.js';
import { cleanText, PHONE_PATTERN } from './common.js';

const optional = (max: number) =>
  cleanText(max)
    .optional()
    .transform((v) => v || undefined);

const httpsUrl = z
  .url()
  .max(500)
  .refine((v) => /^https:\/\//i.test(v), 'Links must start with https://');

export const updateSettingsSchema = z
  .object({
    dealershipName: cleanText(80).pipe(z.string().min(1)),
    tagline: optional(200),
    phone: z
      .union([z.literal(''), z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number.')])
      .optional()
      .transform((v) => v || undefined),
    additionalPhones: z.array(z.string().trim().regex(PHONE_PATTERN, 'Enter a valid phone number.')).max(4).default([]),
    whatsapp: z
      .union([z.literal(''), z.string().trim().regex(/^\+?[\d\s]{8,20}$/, 'Use international format, e.g. +233 24 123 4567.')])
      .optional()
      .transform((v) => v || undefined),
    email: z
      .union([z.literal(''), z.email().max(120)])
      .optional()
      .transform((v) => v || undefined),
    address: optional(300),
    mapUrl: z
      .union([z.literal(''), httpsUrl])
      .optional()
      .transform((v) => v || undefined),
    openingHours: z.array(z.object({ label: cleanText(40).pipe(z.string().min(1)), hours: cleanText(80).pipe(z.string().min(1)) })).max(10).default([]),
    socialLinks: z.array(z.object({ label: cleanText(30).pipe(z.string().min(1)), url: httpsUrl })).max(10).default([]),
    defaultCurrency: z.enum(CURRENCIES),
    supportedCurrencies: z.array(z.enum(CURRENCIES)).min(1).max(CURRENCIES.length),
    exchangeRateMode: z.enum(EXCHANGE_RATE_MODES).default('live'),
    exchangeRates: z
      .object({
        rates: z.partialRecord(z.enum(CURRENCIES), z.number().positive().max(1_000_000)),
        source: optional(120),
      })
      .optional(),
    aboutHeading: optional(120),
    aboutBody: optional(4000),
    whyChooseUs: z.array(z.object({ title: cleanText(60).pipe(z.string().min(1)), body: cleanText(300).pipe(z.string().min(1)) })).max(6).default([]),
    privacyNotice: optional(4000),
  })
  .refine((v) => v.supportedCurrencies.includes(v.defaultCurrency), {
    message: 'The default currency must be one of the supported currencies.',
    path: ['supportedCurrencies'],
  });
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
