import type { Request, Response } from 'express';
import { publicVehicleQuery, slugParams } from '../schemas/vehicle.js';
import { createEnquirySchema } from '../schemas/enquiry.js';
import * as vehicles from '../services/vehicleService.js';
import * as enquiries from '../services/enquiryService.js';
import { defaultSettingsRecord, getSettingsRecord, serializePublicSettings } from '../services/settingsService.js';

const PUBLIC_CACHE = 'public, max-age=30, stale-while-revalidate=120';

export async function getPublicSettings(_req: Request, res: Response, databaseReady = true) {
  const settings = await serializePublicSettings(databaseReady ? await getSettingsRecord() : defaultSettingsRecord());
  // Defaults are only a stand-in until the database is back, so don't let browsers keep them.
  res.set('Cache-Control', databaseReady ? 'public, max-age=60, stale-while-revalidate=300' : 'no-store').json(settings);
}

export async function listVehicles(req: Request, res: Response) {
  const query = publicVehicleQuery.parse(req.query);
  res.set('Cache-Control', PUBLIC_CACHE).json(await vehicles.listPublicVehicles(query));
}

export async function getFacets(_req: Request, res: Response) {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300').json(await vehicles.getPublicFacets());
}

export async function getVehicle(req: Request, res: Response) {
  const { slug } = slugParams.parse(req.params);
  res.set('Cache-Control', PUBLIC_CACHE).json(await vehicles.getPublicVehicleBySlug(slug));
}

export async function submitEnquiry(req: Request, res: Response) {
  const input = createEnquirySchema.parse(req.body);
  const result = await enquiries.createEnquiry(input, req.ip);
  res.status(201).set('Cache-Control', 'no-store').json(result);
}
