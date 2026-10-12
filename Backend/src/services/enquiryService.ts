import { createHash } from 'node:crypto';
import { Types, type QueryFilter } from 'mongoose';
import { Enquiry, type EnquiryRecord } from '../models/Enquiry.js';
import { Vehicle } from '../models/Vehicle.js';
import { Staff } from '../models/Staff.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';
import { escapeRegex, vehicleTitle } from '../lib/text.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { AdminEnquiryQuery, CreateEnquiryInput, UpdateEnquiryInput } from '../schemas/enquiry.js';
import type { StaffPrincipal } from '../middleware/auth.js';
import { serializeEnquiry } from './serializers.js';

/** Submissions faster than this after the form was rendered are almost certainly bots. */
const MIN_FILL_MS = 3000;
const MAX_PER_PHONE_PER_DAY = 6;

export function hashIp(ip: string | undefined): string | undefined {
  if (!ip) return undefined;
  const salt = env.ENQUIRY_IP_SALT ?? 'development-only-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * Stores a public enquiry. Suspected spam receives the same success response as a
 * real submission (so bots learn nothing) but is never saved.
 */
export async function createEnquiry(input: CreateEnquiryInput, ip: string | undefined): Promise<{ id: string }> {
  const looksAutomated = Boolean(input.website) || (input.startedAt !== undefined && Date.now() - input.startedAt < MIN_FILL_MS);
  if (looksAutomated) {
    logger.info('Discarded suspected spam enquiry');
    return { id: new Types.ObjectId().toString() };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentFromPhone = await Enquiry.countDocuments({ phone: input.phone, createdAt: { $gte: since } });
  if (recentFromPhone >= MAX_PER_PHONE_PER_DAY) {
    throw new AppError(429, 'rate_limited', 'We have already received several enquiries from this number today. Our team will be in touch, or you can call us directly.');
  }

  let vehicleSnapshot: EnquiryRecord['vehicleSnapshot'];
  if (input.vehicleId) {
    const vehicle = await Vehicle.findOne({ _id: input.vehicleId, visibility: 'published' }, { make: 1, model: 1, year: 1, slug: 1, price: 1, currency: 1 }).lean();
    if (!vehicle) throw badRequest('The selected vehicle is no longer listed.');
    vehicleSnapshot = { title: vehicleTitle(vehicle), slug: vehicle.slug, price: vehicle.price, currency: vehicle.currency };
  }

  const doc = await Enquiry.create({
    vehicle: input.vehicleId ? new Types.ObjectId(input.vehicleId) : undefined,
    vehicleSnapshot,
    name: input.name,
    phone: input.phone,
    email: input.email,
    message: input.message,
    preferredContact: input.preferredContact,
    consentAt: new Date(),
    status: 'new',
    ipHash: hashIp(ip),
  });
  return { id: doc._id.toString() };
}

export async function listEnquiries(query: AdminEnquiryQuery, actor: StaffPrincipal) {
  const filter: QueryFilter<EnquiryRecord> = {};
  if (query.status) filter.status = query.status;
  if (query.assigned === 'me') filter.assignedTo = new Types.ObjectId(actor.id);
  else if (query.assigned === 'unassigned') filter.assignedTo = { $exists: false };
  else if (query.assigned) filter.assignedTo = new Types.ObjectId(query.assigned);
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { 'vehicleSnapshot.title': rx }];
  }
  const skip = (query.page - 1) * query.limit;
  const [docs, total] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('assignedTo', 'displayName').lean(),
    Enquiry.countDocuments(filter),
  ]);
  return {
    items: docs.map((d) => serializeEnquiry(d as never)),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getEnquiry(id: string) {
  const doc = await Enquiry.findById(id).populate('assignedTo', 'displayName').lean();
  if (!doc) throw notFound('Enquiry not found.');
  return serializeEnquiry(doc as never);
}

export async function updateEnquiry(id: string, input: UpdateEnquiryInput) {
  const set: Record<string, unknown> = {};
  const unset: Record<string, ''> = {};
  if (input.status) set.status = input.status;
  if (input.assignedTo === null) unset.assignedTo = '';
  else if (input.assignedTo) {
    const staff = await Staff.findOne({ _id: input.assignedTo, status: 'active' }, { role: 1 }).lean();
    if (!staff || staff.role === 'inventory_manager') throw badRequest('Enquiries can only be assigned to active owners or sales assistants.');
    set.assignedTo = new Types.ObjectId(input.assignedTo);
  }
  const doc = await Enquiry.findByIdAndUpdate(
    id,
    { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: 'after' },
  );
  if (!doc) throw notFound('Enquiry not found.');
  return getEnquiry(id);
}

export async function addEnquiryNote(id: string, body: string, actor: StaffPrincipal) {
  const doc = await Enquiry.findByIdAndUpdate(
    id,
    { $push: { notes: { body, author: new Types.ObjectId(actor.id), authorName: actor.displayName, createdAt: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!doc) throw notFound('Enquiry not found.');
  return getEnquiry(id);
}

export async function enquiryCounts() {
  const [newCount, total] = await Promise.all([Enquiry.countDocuments({ status: 'new' }), Enquiry.countDocuments()]);
  return { new: newCount, total };
}

export async function recentEnquiries(limit = 6) {
  const docs = await Enquiry.find({}, { name: 1, status: 1, createdAt: 1, vehicle: 1, vehicleSnapshot: 1 }).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    vehicle: d.vehicle && d.vehicleSnapshot ? { id: d.vehicle.toString(), title: d.vehicleSnapshot.title, slug: d.vehicleSnapshot.slug } : undefined,
  }));
}
