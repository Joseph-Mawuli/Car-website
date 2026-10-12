import { Router } from 'express';
import * as pub from '../controllers/publicController.js';
import type { RateLimiters } from '../middleware/rateLimit.js';

export function publicRoutes(limiters: RateLimiters): Router {
  const router = Router();
  router.get('/vehicles', pub.listVehicles);
  router.get('/vehicles/facets', pub.getFacets);
  router.get('/vehicles/:slug', pub.getVehicle);
  router.post('/enquiries', limiters.enquiry, pub.submitEnquiry);
  return router;
}
