import { SiteSettings, type SiteLogoRecord, type SiteSettingsRecord } from '../models/SiteSettings.js';
import type { UpdateSettingsInput } from '../schemas/settings.js';
import type { CurrencyCode } from '../types/domain.js';
import { getLiveRates } from './liveRates.js';
import { mongoMediaUrl } from './storage.js';

export async function getSettingsRecord(): Promise<SiteSettingsRecord> {
  const doc = await SiteSettings.findOneAndUpdate(
    { key: 'site' },
    { $setOnInsert: { key: 'site' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
  return doc as SiteSettingsRecord;
}

export interface SerializedRates {
  base: CurrencyCode;
  rates: Partial<Record<CurrencyCode, number>>;
  updatedAt?: string;
  source?: string;
  sourceUrl?: string;
}

/** The owner's own rates, as stored. */
/** Schema defaults, used when the database can't be reached. */
export function defaultSettingsRecord(): SiteSettingsRecord {
  return new SiteSettings({ key: 'site' }).toObject() as SiteSettingsRecord;
}

function serializeRates(s: SiteSettingsRecord): SerializedRates | undefined {
  const rates = s.exchangeRates?.rates;
  if (!rates || !s.exchangeRates?.base) return undefined;
  const entries = rates instanceof Map ? [...rates.entries()] : Object.entries(rates as Record<string, number>);
  const filtered = entries.filter(([code, value]) => code !== s.exchangeRates!.base && typeof value === 'number' && value > 0);
  if (filtered.length === 0) return undefined;
  return {
    base: s.exchangeRates.base,
    rates: Object.fromEntries(filtered),
    updatedAt: s.exchangeRates.updatedAt?.toISOString(),
    source: s.exchangeRates.source,
  };
}

/**
 * The rates visitors' estimates and price filters actually use: live market rates in `live`
 * mode, falling back to the owner's own rates (if any) while the provider is unreachable.
 */
export async function getEffectiveRates(s: SiteSettingsRecord): Promise<SerializedRates | undefined> {
  if ((s.exchangeRateMode ?? 'live') === 'live') {
    const live = await getLiveRates(s.defaultCurrency);
    if (live) return live;
  }
  const own = serializeRates(s);
  return own?.base === s.defaultCurrency ? own : undefined;
}

export async function serializePublicSettings(s: SiteSettingsRecord) {
  const { updatedAt, ...settings } = serializeSettings(s);
  return { ...settings, exchangeRates: await getEffectiveRates(s) };
}

/** Admin view: the owner's stored rates for editing, plus today's live rates for comparison. */
export async function serializeAdminSettings(s: SiteSettingsRecord) {
  return { ...serializeSettings(s), liveExchangeRates: (await getLiveRates(s.defaultCurrency)) ?? undefined };
}

/** MongoDB-stored logos are served by this API, so the link is rebuilt for the current host. */
function logoUrl(logo: SiteLogoRecord): string {
  return logo.source === 'mongodb' ? mongoMediaUrl(logo.key) : logo.url;
}

function serializeSettings(s: SiteSettingsRecord) {
  return {
    dealershipName: s.dealershipName,
    motto: s.motto ?? s.tagline,
    logoUrl: s.logo ? logoUrl(s.logo) : undefined,
    logoIncludesName: Boolean(s.logo && s.logoIncludesName),
    phone: s.phone,
    additionalPhones: s.additionalPhones ?? [],
    whatsapp: s.whatsapp,
    email: s.email,
    address: s.address,
    mapUrl: s.mapUrl,
    openingHours: s.openingHours ?? [],
    socialLinks: s.socialLinks ?? [],
    defaultCurrency: s.defaultCurrency,
    supportedCurrencies: s.supportedCurrencies?.length ? s.supportedCurrencies : [s.defaultCurrency],
    exchangeRateMode: s.exchangeRateMode ?? 'live',
    exchangeRates: serializeRates(s),
    aboutHeading: s.aboutHeading,
    aboutBody: s.aboutBody,
    whyChooseUs: s.whyChooseUs ?? [],
    privacyNotice: s.privacyNotice,
    updatedAt: s.updatedAt?.toISOString(),
  };
}

function ratesEqual(a: Record<string, number> | undefined, b: Record<string, number> | undefined): boolean {
  const ka = Object.keys(a ?? {}).sort();
  const kb = Object.keys(b ?? {}).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a![k] === b![k]);
}

export async function updateSettings(input: UpdateSettingsInput) {
  const current = await getSettingsRecord();
  const currentRates = serializeRates(current);

  const base: CurrencyCode = input.defaultCurrency;
  const nextRates = input.exchangeRates
    ? Object.fromEntries(
        Object.entries(input.exchangeRates.rates).filter(
          ([code, v]) => code !== base && input.supportedCurrencies.includes(code as CurrencyCode) && typeof v === 'number',
        ),
      )
    : {};

  // The "last updated" timestamp only moves when the rates actually change.
  const ratesChanged = currentRates?.base !== base || !ratesEqual(currentRates?.rates, nextRates);

  const { exchangeRates, ...rest } = input;
  const update: Record<string, unknown> = { ...rest };
  const unset: Record<string, ''> = { tagline: '' };
  for (const key of ['motto', 'phone', 'whatsapp', 'email', 'address', 'mapUrl', 'aboutHeading', 'aboutBody', 'privacyNotice'] as const) {
    if (input[key] === undefined) {
      delete update[key];
      unset[key] = '';
    }
  }

  if (Object.keys(nextRates).length === 0) {
    unset.exchangeRates = '';
  } else {
    update.exchangeRates = {
      base,
      rates: nextRates,
      source: input.exchangeRates?.source,
      updatedAt: ratesChanged ? new Date() : (current.exchangeRates?.updatedAt ?? new Date()),
    };
  }

  const doc = await SiteSettings.findOneAndUpdate(
    { key: 'site' },
    { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: 'after', upsert: true, runValidators: true },
  ).lean();
  return {
    settings: await serializeAdminSettings(doc as SiteSettingsRecord),
    ratesChanged,
    modeChanged: (current.exchangeRateMode ?? 'live') !== input.exchangeRateMode,
  };
}
