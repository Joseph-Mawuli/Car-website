import type { Request, Response } from 'express';
import { z } from 'zod';
import { idParams, pageQuery } from '../schemas/common.js';
import { addNoteSchema, adminEnquiryQuery, updateEnquirySchema } from '../schemas/enquiry.js';
import { inviteStaffSchema, updateStaffSchema } from '../schemas/staff.js';
import { updateSettingsSchema } from '../schemas/settings.js';
import * as enquiries from '../services/enquiryService.js';
import * as staff from '../services/staffService.js';
import * as vehicles from '../services/vehicleService.js';
import { getSettingsRecord, serializeAdminSettings, updateSettings } from '../services/settingsService.js';
import { listAuditLogs, recordAudit } from '../services/auditService.js';
import { removeLogo, setLogo } from '../services/logoService.js';
import type { SetupLinkDelivery } from '../services/setupLinkDelivery.js';
import { hasPermission } from '../lib/permissions.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { permissionsFor } from '../middleware/auth.js';

export async function me(req: Request, res: Response) {
  const principal = req.staff!;
  await staff.touchLastLogin(principal.id);
  const profile = await staff.getStaffMember(principal.id);
  res.set('Cache-Control', 'no-store').json({ ...profile, permissions: permissionsFor(principal.role) });
}

export async function dashboard(req: Request, res: Response) {
  const role = req.staff!.role;
  const canSeeEnquiries = hasPermission(role, 'enquiries:read');
  const [vehicleCounts, recentVehicles, enquiryCounts, recent] = await Promise.all([
    vehicles.vehicleCounts(),
    vehicles.recentVehicleUpdates(),
    canSeeEnquiries ? enquiries.enquiryCounts() : Promise.resolve(undefined),
    canSeeEnquiries ? enquiries.recentEnquiries() : Promise.resolve(undefined),
  ]);
  res.json({ vehicles: vehicleCounts, recentVehicles, enquiries: enquiryCounts, recentEnquiries: recent });
}

// ---------- Enquiries ----------

export async function listEnquiries(req: Request, res: Response) {
  res.json(await enquiries.listEnquiries(adminEnquiryQuery.parse(req.query), req.staff!));
}

export async function getEnquiry(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  res.json(await enquiries.getEnquiry(id));
}

export async function updateEnquiry(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const input = updateEnquirySchema.parse(req.body);
  if (input.assignedTo !== undefined && !hasPermission(req.staff!.role, 'enquiries:assign')) {
    throw forbidden('Only the owner can assign enquiries to staff.');
  }
  const before = await enquiries.getEnquiry(id);
  const updated = await enquiries.updateEnquiry(id, input);
  const parts: string[] = [];
  if (input.status && input.status !== before.status) parts.push(`status ${before.status} → ${input.status}`);
  if (input.assignedTo !== undefined) parts.push(`assigned to ${updated.assignedTo?.name ?? 'nobody'}`);
  if (parts.length) await recordAudit(req.staff!, { action: 'enquiry.update', targetType: 'enquiry', targetId: id, summary: parts.join('; ') });
  res.json(updated);
}

export async function addEnquiryNote(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const { body } = addNoteSchema.parse(req.body);
  res.status(201).json(await enquiries.addEnquiryNote(id, body, req.staff!));
}

export async function assignees(_req: Request, res: Response) {
  res.json(await staff.assignableStaff());
}

// ---------- Staff ----------

export async function listStaff(_req: Request, res: Response) {
  res.json(await staff.listStaff());
}

export async function inviteStaff(req: Request, res: Response) {
  const input = inviteStaffSchema.parse(req.body);
  const result = await staff.inviteStaff(input, req.staff!);
  await recordAudit(req.staff!, {
    action: 'staff.invite',
    targetType: 'staff',
    targetId: result.staff.id,
    summary: `Invited ${result.staff.email} as ${result.staff.role} (${deliverySummary(result.delivery)})`,
  });
  // A manual setup link is shown to the owner once and never stored or logged.
  res.status(201).set('Cache-Control', 'no-store').json(result);
}

export async function updateStaff(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const input = updateStaffSchema.parse(req.body);
  const { before, after } = await staff.updateStaff(id, input, req.staff!);
  const parts: string[] = [];
  if (before.role !== after.role) parts.push(`role ${before.role} → ${after.role}`);
  if (before.status !== after.status) parts.push(after.status === 'disabled' ? 'access disabled' : 'access re-enabled');
  if (before.displayName !== after.displayName) parts.push('name updated');
  await recordAudit(req.staff!, { action: 'staff.update', targetType: 'staff', targetId: id, summary: `${after.email}: ${parts.join('; ') || 'no changes'}` });
  res.json(after);
}

export async function staffSetupLink(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const result = await staff.resendSetupLink(id, req.staff!);
  await recordAudit(req.staff!, { action: 'staff.setup_link', targetType: 'staff', targetId: id, summary: `New sign-in setup link for ${result.email} (${deliverySummary(result.delivery)})` });
  res.set('Cache-Control', 'no-store').json(result);
}

function deliverySummary(delivery: SetupLinkDelivery): string {
  if (delivery.method === 'smtp') return 'emailed';
  if (delivery.method === 'firebase') return 'emailed by Firebase';
  return delivery.notice ? 'email failed, link shown to owner' : 'link shown to owner';
}

// ---------- Settings & audit ----------

export async function getSettings(_req: Request, res: Response) {
  res.json(await serializeAdminSettings(await getSettingsRecord()));
}

export async function putSettings(req: Request, res: Response) {
  const input = updateSettingsSchema.parse(req.body);
  const { settings, ratesChanged, modeChanged } = await updateSettings(input);
  const rateNote = modeChanged
    ? ` (switched to ${input.exchangeRateMode === 'live' ? 'live' : 'own'} exchange rates)`
    : ratesChanged
      ? ' and exchange rates'
      : '';
  await recordAudit(req.staff!, {
    action: 'settings.update',
    targetType: 'settings',
    summary: `Updated site settings${rateNote}`,
  });
  res.json(settings);
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) throw badRequest('Choose a logo image to upload.');
  const settings = await setLogo(req.file);
  await recordAudit(req.staff!, { action: 'settings.logo.upload', targetType: 'settings', summary: 'Uploaded a new logo' });
  res.json(settings);
}

export async function deleteLogo(req: Request, res: Response) {
  const settings = await removeLogo();
  await recordAudit(req.staff!, { action: 'settings.logo.delete', targetType: 'settings', summary: 'Removed the custom logo' });
  res.json(settings);
}

const auditQuery = z.object({ ...pageQuery, limit: z.coerce.number().int().min(1).max(100).default(30) });

export async function auditLogs(req: Request, res: Response) {
  const { page, limit } = auditQuery.parse(req.query);
  res.json(await listAuditLogs(page, limit));
}
