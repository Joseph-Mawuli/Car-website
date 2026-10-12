import { Types, type PipelineStage, type QueryFilter, type SortOrder } from 'mongoose';
import { priceInBase, priceInBaseExpression, pricingContext } from '../lib/pricing.js';
import { Vehicle, type VehicleRecord } from '../models/Vehicle.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { escapeRegex, vehicleSlug, vehicleTitle } from '../lib/text.js';
import type { AdminVehicleQuery, CreateVehicleInput, PublicVehicleQuery, UpdateVehicleInput } from '../schemas/vehicle.js';
import type { StaffPrincipal } from '../middleware/auth.js';
import { serializeAdminVehicle, serializeVehicle, serializeVehicleSummary } from './serializers.js';
import { getEffectiveRates, getSettingsRecord } from './settingsService.js';
import { deleteStoredImages } from './imageService.js';

const SUMMARY_PROJECTION = {
  slug: 1, make: 1, model: 1, trim: 1, year: 1, price: 1, currency: 1, condition: 1, availabilityStatus: 1,
  bodyType: 1, mileage: 1, mileageUnit: 1, fuelType: 1, transmission: 1, location: 1, isDemo: 1, createdAt: 1,
  images: { $slice: 24 },
} as const;

function keywordFilter(q: string): QueryFilter<VehicleRecord> {
  // Every word must match make, model or trim — supports "toyota rav4" style searches.
  const words = q.split(/\s+/).filter(Boolean).slice(0, 5);
  return {
    $and: words.map((w) => {
      const rx = new RegExp(escapeRegex(w), 'i');
      return { $or: [{ make: rx }, { model: rx }, { trim: rx }, { bodyType: rx }, { exteriorColor: rx }] };
    }),
  };
}

function availabilityFilter(value: PublicVehicleQuery['availability']): QueryFilter<VehicleRecord> {
  switch (value) {
    case 'in_stock':
      return { availabilityStatus: { $in: ['available', 'reserved'] } };
    case 'all':
      return {};
    default:
      return { availabilityStatus: value };
  }
}

function sortFor(sort: string): Record<string, SortOrder> {
  switch (sort) {
    case 'price_asc':
      return { price: 1, createdAt: -1 };
    case 'price_desc':
      return { price: -1, createdAt: -1 };
    case 'updated':
      return { updatedAt: -1 };
    default:
      return { createdAt: -1 };
  }
}

export async function listPublicVehicles(query: PublicVehicleQuery) {
  const filter: QueryFilter<VehicleRecord> = { visibility: 'published', ...availabilityFilter(query.availability) };
  const and: QueryFilter<VehicleRecord>[] = [];
  if (query.q) and.push(keywordFilter(query.q));
  if (query.make) filter.make = new RegExp(`^${escapeRegex(query.make)}$`, 'i');
  if (query.bodyType) filter.bodyType = query.bodyType;
  if (query.fuelType) filter.fuelType = query.fuelType;
  if (query.transmission) filter.transmission = query.transmission;
  if (query.condition) filter.condition = query.condition;
  if (query.minYear || query.maxYear) filter.year = { ...(query.minYear ? { $gte: query.minYear } : {}), ...(query.maxYear ? { $lte: query.maxYear } : {}) };
  if (and.length) filter.$and = and;

  const skip = (query.page - 1) * query.limit;
  const hasPriceFilter = query.minPrice !== undefined || query.maxPrice !== undefined;
  const sortsByPrice = query.sort === 'price_asc' || query.sort === 'price_desc';

  if (!hasPriceFilter && !sortsByPrice) {
    const [docs, total] = await Promise.all([
      Vehicle.find(filter, SUMMARY_PROJECTION).sort(sortFor(query.sort)).skip(skip).limit(query.limit).lean(),
      Vehicle.countDocuments(filter),
    ]);
    return paged(docs, total, query);
  }

  // Price filters and price sorting compare every listing in the default currency, so a car
  // listed in USD is matched by its exchange-rate equivalent rather than its raw number.
  const ctx = await currentPricingContext();
  const pipeline: PipelineStage[] = [{ $match: filter as Record<string, unknown> }, { $addFields: { priceInBase: priceInBaseExpression(ctx) } }];
  if (hasPriceFilter) {
    const boundCurrency = query.priceCurrency ?? ctx.base;
    const toBase = (amount: number | undefined) => {
      if (amount === undefined) return undefined;
      const inBase = priceInBase(amount, boundCurrency, ctx);
      if (inBase === null) throw badRequest(`Prices can't be compared in ${boundCurrency} right now. Try again in ${ctx.base}.`);
      return inBase;
    };
    const min = toBase(query.minPrice);
    const max = toBase(query.maxPrice);
    pipeline.push({
      $match: {
        priceInBase: {
          $ne: null,
          ...(min !== undefined ? { $gte: min } : {}),
          ...(max !== undefined ? { $lte: max } : {}),
        },
      },
    });
  }
  const direction = query.sort === 'price_desc' ? -1 : 1;
  const sort: Record<string, 1 | -1> = sortsByPrice ? { priceUnknown: 1, priceInBase: direction, createdAt: -1 } : { ...(sortFor(query.sort) as Record<string, 1 | -1>) };
  pipeline.push(
    { $addFields: { priceUnknown: { $cond: [{ $eq: ['$priceInBase', null] }, 1, 0] } } },
    {
      $facet: {
        items: [{ $sort: sort }, { $skip: skip }, { $limit: query.limit }, { $project: { ...SUMMARY_PROJECTION, images: { $slice: ['$images', 24] } } }],
        total: [{ $count: 'n' }],
      },
    },
  );
  const [result] = await Vehicle.aggregate<{ items: unknown[]; total: { n: number }[] }>(pipeline);
  return paged(result?.items ?? [], result?.total[0]?.n ?? 0, query);
}

function paged(docs: unknown[], total: number, query: Pick<PublicVehicleQuery, 'page' | 'limit'>) {
  return {
    items: docs.map((d) => serializeVehicleSummary(d as never)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

async function currentPricingContext() {
  const settings = await getSettingsRecord();
  return pricingContext({ defaultCurrency: settings.defaultCurrency, exchangeRates: await getEffectiveRates(settings) });
}

export async function getPublicFacets() {
  const ctx = await currentPricingContext();
  const [result] = await Vehicle.aggregate<{
    makes: string[];
    bodyTypes: string[];
    fuelTypes: string[];
    transmissions: string[];
    conditions: string[];
    minYear: number | null;
    maxYear: number | null;
    minPrice: number | null;
    maxPrice: number | null;
  }>([
    { $match: { visibility: 'published' } },
    { $addFields: { priceInBase: priceInBaseExpression(ctx) } },
    {
      $group: {
        _id: null,
        makes: { $addToSet: '$make' },
        bodyTypes: { $addToSet: '$bodyType' },
        fuelTypes: { $addToSet: '$fuelType' },
        transmissions: { $addToSet: '$transmission' },
        conditions: { $addToSet: '$condition' },
        minYear: { $min: '$year' },
        maxYear: { $max: '$year' },
        minPrice: { $min: '$priceInBase' },
        maxPrice: { $max: '$priceInBase' },
      },
    },
  ]);
  const clean = (list?: (string | null)[]) => (list ?? []).filter((v): v is string => Boolean(v)).sort((a, b) => a.localeCompare(b));
  return {
    makes: clean(result?.makes),
    bodyTypes: clean(result?.bodyTypes),
    fuelTypes: clean(result?.fuelTypes),
    transmissions: clean(result?.transmissions),
    conditions: clean(result?.conditions),
    years: { min: result?.minYear ?? null, max: result?.maxYear ?? null },
    price: { min: result?.minPrice ?? null, max: result?.maxPrice ?? null },
  };
}

export async function getPublicVehicleBySlug(slug: string) {
  const doc = await Vehicle.findOne({ slug, visibility: 'published' }).lean();
  if (!doc) throw notFound('Vehicle not found.');

  const base: QueryFilter<VehicleRecord> = { visibility: 'published', availabilityStatus: { $in: ['available', 'reserved'] }, _id: { $ne: doc._id } };
  const similarity: QueryFilter<VehicleRecord>[] = [{ make: doc.make }];
  if (doc.bodyType) similarity.push({ bodyType: doc.bodyType });
  const similar = await Vehicle.find({ ...base, $or: similarity }, SUMMARY_PROJECTION)
    .sort({ createdAt: -1 })
    .limit(4)
    .lean();
  let related = similar;
  if (related.length < 4) {
    const extraFilter: QueryFilter<VehicleRecord> = { ...base, _id: { $nin: [doc._id, ...related.map((r) => r._id)] } };
    const extra = await Vehicle.find(extraFilter, SUMMARY_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(4 - related.length)
      .lean();
    related = [...related, ...extra];
  }

  return { vehicle: serializeVehicle(doc as never), related: related.map((r) => serializeVehicleSummary(r as never)) };
}

export async function listPublishedSlugs() {
  return Vehicle.find({ visibility: 'published' }, { slug: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(5000).lean();
}

// ---------- Admin ----------

export async function listAdminVehicles(query: AdminVehicleQuery) {
  const filter: QueryFilter<VehicleRecord> = {};
  if (query.availability) filter.availabilityStatus = query.availability;
  if (query.visibility) filter.visibility = query.visibility;
  else filter.visibility = { $ne: 'archived' };
  if (query.q) Object.assign(filter, keywordFilter(query.q));

  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    Vehicle.find(filter).sort(sortFor(query.sort)).skip(skip).limit(query.limit).populate('updatedBy', 'displayName').lean(),
    Vehicle.countDocuments(filter),
  ]);
  return {
    items: docs.map((d) => serializeAdminVehicle(d as never)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getAdminVehicle(id: string) {
  const doc = await Vehicle.findById(id).populate('createdBy', 'displayName').populate('updatedBy', 'displayName').lean();
  if (!doc) throw notFound('Vehicle not found.');
  return serializeAdminVehicle(doc as never);
}

function splitNulls<T extends Record<string, unknown>>(input: T) {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (value === null) unset[key] = '';
    else set[key] = value;
  }
  return { set, unset };
}

export async function createVehicle(input: CreateVehicleInput, actor: StaffPrincipal) {
  const { set } = splitNulls(input);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const doc = await Vehicle.create({
        ...set,
        slug: vehicleSlug({ year: input.year, make: input.make, model: input.model, trim: input.trim }),
        createdBy: new Types.ObjectId(actor.id),
        updatedBy: new Types.ObjectId(actor.id),
      });
      return getAdminVehicle(doc._id.toString());
    } catch (err) {
      // Extremely unlikely slug collision — regenerate and retry.
      if ((err as { code?: number }).code === 11000 && attempt < 2) continue;
      throw err;
    }
  }
  throw conflict('Could not create a unique link for this vehicle. Please try again.');
}

export async function updateVehicle(id: string, input: UpdateVehicleInput, actor: StaffPrincipal) {
  const { version, ...fields } = input;
  const { set, unset } = splitNulls(fields);
  for (const required of ['make', 'model', 'year', 'price', 'currency', 'availabilityStatus', 'visibility']) {
    if (required in unset) delete unset[required];
  }
  const updated = await Vehicle.findOneAndUpdate(
    { _id: id, __v: version },
    {
      $set: { ...set, updatedBy: new Types.ObjectId(actor.id) },
      ...(Object.keys(unset).length ? { $unset: unset } : {}),
      $inc: { __v: 1 },
    },
    { returnDocument: 'after', runValidators: true },
  );
  if (!updated) {
    const exists = await Vehicle.exists({ _id: id });
    if (!exists) throw notFound('Vehicle not found.');
    throw conflict('This vehicle was changed by someone else while you were editing. Reload to see the latest version, then apply your changes again.', 'version_conflict');
  }
  return getAdminVehicle(id);
}

export async function setVisibility(id: string, visibility: 'archived' | 'draft' | 'published', actor: StaffPrincipal) {
  const updated = await Vehicle.findByIdAndUpdate(
    id,
    { $set: { visibility, updatedBy: new Types.ObjectId(actor.id) }, $inc: { __v: 1 } },
    { returnDocument: 'after' },
  );
  if (!updated) throw notFound('Vehicle not found.');
  return getAdminVehicle(id);
}

export async function deleteVehicle(id: string) {
  const doc = await Vehicle.findByIdAndDelete(id).lean();
  if (!doc) throw notFound('Vehicle not found.');
  await deleteStoredImages(doc.images, `vehicle ${id} deleted`);
  return { title: vehicleTitle(doc) };
}

export async function vehicleCounts() {
  const rows = await Vehicle.aggregate<{ _id: { visibility: string; availability: string }; count: number }>([
    { $group: { _id: { visibility: '$visibility', availability: '$availabilityStatus' }, count: { $sum: 1 } } },
  ]);
  const counts = { total: 0, available: 0, reserved: 0, sold: 0, draft: 0, archived: 0 };
  for (const r of rows) {
    if (r._id.visibility === 'archived') {
      counts.archived += r.count;
      continue;
    }
    counts.total += r.count;
    if (r._id.visibility === 'draft') counts.draft += r.count;
    if (r._id.availability === 'available') counts.available += r.count;
    if (r._id.availability === 'reserved') counts.reserved += r.count;
    if (r._id.availability === 'sold') counts.sold += r.count;
  }
  return counts;
}

export async function recentVehicleUpdates(limit = 6) {
  const docs = await Vehicle.find({}, { make: 1, model: 1, year: 1, updatedAt: 1, availabilityStatus: 1, visibility: 1 })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    title: vehicleTitle(d),
    updatedAt: d.updatedAt.toISOString(),
    availabilityStatus: d.availabilityStatus,
    visibility: d.visibility,
  }));
}
