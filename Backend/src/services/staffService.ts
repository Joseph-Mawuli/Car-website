import { Types } from 'mongoose';
import { Staff } from '../models/Staff.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import { firebaseAuth } from '../lib/firebase.js';
import { getSettingsRecord } from './settingsService.js';
import { deliverSetupLink } from './setupLinkDelivery.js';
import type { StaffPrincipal } from '../middleware/auth.js';
import type { InviteStaffInput, UpdateStaffInput } from '../schemas/staff.js';
import { serializeStaff } from './serializers.js';

export async function findStaffByUid(uid: string): Promise<StaffPrincipal | null> {
  const s = await Staff.findOne({ firebaseUid: uid }).lean();
  if (!s) return null;
  return { id: s._id.toString(), uid: s.firebaseUid, email: s.email, displayName: s.displayName, role: s.role, status: s.status };
}

export async function touchLastLogin(id: string): Promise<void> {
  // Throttled so frequent page loads don't write on every request.
  const threshold = new Date(Date.now() - 10 * 60 * 1000);
  await Staff.updateOne({ _id: id, $or: [{ lastLoginAt: { $exists: false } }, { lastLoginAt: { $lt: threshold } }] }, { $set: { lastLoginAt: new Date() } });
}

export async function getStaffMember(id: string) {
  const s = await Staff.findById(id).lean();
  if (!s) throw notFound('Staff member not found.');
  return serializeStaff(s);
}

export async function listStaff() {
  const docs = await Staff.find().sort({ status: 1, role: 1, displayName: 1 }).lean();
  return docs.map(serializeStaff);
}

async function dealershipName(): Promise<string> {
  return (await getSettingsRecord()).dealershipName || 'Goddel Motors';
}

/**
 * Creates (or links) the Firebase account and the staff record, then emails the new staff
 * member a one-time password-setup link (falling back to a link for the owner to share).
 * There is no public sign-up: this owner-only endpoint is the only way to gain dashboard access.
 */
export async function inviteStaff(input: InviteStaffInput, actor: StaffPrincipal) {
  if (await Staff.exists({ email: input.email })) throw conflict('A staff member with this email already exists.');

  const auth = firebaseAuth();
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(input.email);
    uid = existing.uid;
    if (existing.disabled) await auth.updateUser(uid, { disabled: false });
  } catch (err) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const created = await auth.createUser({ email: input.email, displayName: input.displayName, emailVerified: false, disabled: false });
    uid = created.uid;
  }

  if (await Staff.exists({ firebaseUid: uid })) throw conflict('This account is already linked to a staff member.');

  const doc = await Staff.create({
    firebaseUid: uid,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    status: 'active',
    invitedBy: new Types.ObjectId(actor.id),
  });
  const delivery = await deliverSetupLink({
    email: input.email,
    name: input.displayName,
    role: input.role,
    invitedBy: actor.displayName,
    dealershipName: await dealershipName(),
    isReminder: false,
  });
  return { staff: serializeStaff(doc.toObject()), delivery };
}

export async function resendSetupLink(id: string, actor: StaffPrincipal) {
  const s = await Staff.findById(id).lean();
  if (!s) throw notFound('Staff member not found.');
  if (s.status !== 'active') throw badRequest('Re-enable this account before sending a new sign-in link.');
  const delivery = await deliverSetupLink({
    email: s.email,
    name: s.displayName,
    role: s.role,
    invitedBy: actor.displayName,
    dealershipName: await dealershipName(),
    isReminder: true,
  });
  return { email: s.email, delivery };
}

export async function updateStaff(id: string, input: UpdateStaffInput, actor: StaffPrincipal) {
  const target = await Staff.findById(id).lean();
  if (!target) throw notFound('Staff member not found.');

  if (id === actor.id && (input.role || input.status)) {
    throw badRequest('You cannot change your own role or disable your own account.');
  }

  const losingOwner = target.role === 'owner' && ((input.role && input.role !== 'owner') || input.status === 'disabled');
  if (losingOwner) {
    const activeOwners = await Staff.countDocuments({ role: 'owner', status: 'active' });
    if (activeOwners <= 1) throw badRequest('There must always be at least one active owner.');
  }

  const auth = firebaseAuth();
  if (input.status === 'disabled' && target.status !== 'disabled') {
    // Block sign-in and invalidate existing sessions; the auth middleware also checks
    // the database status on every request, so access ends immediately.
    await auth.updateUser(target.firebaseUid, { disabled: true });
    await auth.revokeRefreshTokens(target.firebaseUid);
  } else if (input.status === 'active' && target.status === 'disabled') {
    await auth.updateUser(target.firebaseUid, { disabled: false });
  }

  const doc = await Staff.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true }).lean();
  if (!doc) throw notFound('Staff member not found.');
  return { before: serializeStaff(target), after: serializeStaff(doc) };
}

export async function assignableStaff() {
  const docs = await Staff.find({ status: 'active', role: { $in: ['owner', 'sales_assistant'] } }, { displayName: 1, role: 1 }).sort({ displayName: 1 }).lean();
  return docs.map((d) => ({ id: d._id.toString(), name: d.displayName, role: d.role }));
}
