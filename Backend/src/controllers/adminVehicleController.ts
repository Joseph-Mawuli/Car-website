import type { Request, Response } from 'express';
import { idParams } from '../schemas/common.js';
import {
  adminVehicleQuery,
  createVehicleSchema,
  imageParams,
  reorderImagesSchema,
  updateImageSchema,
  updateVehicleSchema,
} from '../schemas/vehicle.js';
import * as vehicles from '../services/vehicleService.js';
import * as images from '../services/imageService.js';
import { recordAudit } from '../services/auditService.js';
import { badRequest, forbidden } from '../lib/errors.js';
import { hasPermission } from '../lib/permissions.js';

export async function list(req: Request, res: Response) {
  const query = adminVehicleQuery.parse(req.query);
  if (query.visibility === 'archived' && !hasPermission(req.staff!.role, 'vehicles:archive')) throw forbidden();
  res.json(await vehicles.listAdminVehicles(query));
}

export async function get(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  res.json(await vehicles.getAdminVehicle(id));
}

export async function create(req: Request, res: Response) {
  const input = createVehicleSchema.parse(req.body);
  if (input.visibility === 'archived') throw badRequest('New vehicles cannot be created as archived.');
  const vehicle = await vehicles.createVehicle(input, req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.create', targetType: 'vehicle', targetId: vehicle.id, summary: `Created ${vehicle.title}` });
  res.status(201).json(vehicle);
}

export async function update(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const input = updateVehicleSchema.parse(req.body);
  if (input.visibility === 'archived' && !hasPermission(req.staff!.role, 'vehicles:archive')) throw forbidden('Only the owner can archive vehicles.');
  const before = await vehicles.getAdminVehicle(id);
  if (before.visibility === 'archived' && !hasPermission(req.staff!.role, 'vehicles:archive')) throw forbidden('Archived vehicles can only be edited by the owner.');
  const vehicle = await vehicles.updateVehicle(id, input, req.staff!);

  const changes: string[] = [];
  if (before.price !== vehicle.price || before.currency !== vehicle.currency) changes.push(`price ${before.currency} ${before.price} → ${vehicle.currency} ${vehicle.price}`);
  if (before.availabilityStatus !== vehicle.availabilityStatus) changes.push(`availability ${before.availabilityStatus} → ${vehicle.availabilityStatus}`);
  if (before.visibility !== vehicle.visibility) changes.push(`visibility ${before.visibility} → ${vehicle.visibility}`);
  await recordAudit(req.staff!, {
    action: 'vehicle.update',
    targetType: 'vehicle',
    targetId: id,
    summary: `Updated ${vehicle.title}${changes.length ? `: ${changes.join('; ')}` : ''}`,
  });
  res.json(vehicle);
}

export async function archive(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const vehicle = await vehicles.setVisibility(id, 'archived', req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.archive', targetType: 'vehicle', targetId: id, summary: `Archived ${vehicle.title}` });
  res.json(vehicle);
}

export async function restore(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const vehicle = await vehicles.setVisibility(id, 'draft', req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.restore', targetType: 'vehicle', targetId: id, summary: `Restored ${vehicle.title} as draft` });
  res.json(vehicle);
}

export async function remove(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const { title } = await vehicles.deleteVehicle(id);
  await recordAudit(req.staff!, { action: 'vehicle.delete', targetType: 'vehicle', targetId: id, summary: `Deleted ${title}` });
  res.status(204).end();
}

export async function uploadImages(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const uploaded = await images.uploadVehicleImages(id, files, req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.images.upload', targetType: 'vehicle', targetId: id, summary: `Uploaded ${uploaded.length} photo(s)` });
  res.status(201).json({ images: uploaded });
}

export async function replaceImage(req: Request, res: Response) {
  const { id, imageId } = imageParams.parse(req.params);
  if (!req.file) throw badRequest('Choose a photo to upload.');
  const image = await images.replaceVehicleImage(id, imageId, req.file, req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.images.replace', targetType: 'vehicle', targetId: id, summary: `Replaced photo ${imageId}` });
  res.json(image);
}

export async function deleteImage(req: Request, res: Response) {
  const { id, imageId } = imageParams.parse(req.params);
  await images.deleteVehicleImage(id, imageId, req.staff!);
  await recordAudit(req.staff!, { action: 'vehicle.images.delete', targetType: 'vehicle', targetId: id, summary: `Deleted photo ${imageId}` });
  res.status(204).end();
}

export async function reorderImages(req: Request, res: Response) {
  const { id } = idParams.parse(req.params);
  const { imageIds } = reorderImagesSchema.parse(req.body);
  await images.reorderVehicleImages(id, imageIds, req.staff!);
  res.status(204).end();
}

export async function updateImage(req: Request, res: Response) {
  const { id, imageId } = imageParams.parse(req.params);
  const { alt } = updateImageSchema.parse(req.body);
  await images.updateImageAlt(id, imageId, alt, req.staff!);
  res.status(204).end();
}
