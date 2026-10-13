import { Router } from 'express';
import { authenticate, requirePermission, type AuthDeps } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';
import type { RateLimiters } from '../middleware/rateLimit.js';
import * as admin from '../controllers/adminController.js';
import * as vehicles from '../controllers/adminVehicleController.js';

/**
 * Every route below requires a verified Firebase token + active staff record
 * (`authenticate`) and an explicit permission check. Upload parsing runs only
 * after authorisation so anonymous requests can't make the server buffer files.
 */
export function adminRoutes(authDeps: AuthDeps, limiters: RateLimiters): Router {
  const router = Router();
  router.use(limiters.adminApi, authenticate(authDeps));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/me', admin.me);
  router.get('/dashboard', requirePermission('dashboard:read'), admin.dashboard);

  router.get('/vehicles', requirePermission('vehicles:read'), vehicles.list);
  router.post('/vehicles', requirePermission('vehicles:write'), vehicles.create);
  router.get('/vehicles/:id', requirePermission('vehicles:read'), vehicles.get);
  router.patch('/vehicles/:id', requirePermission('vehicles:write'), vehicles.update);
  router.post('/vehicles/:id/archive', requirePermission('vehicles:archive'), vehicles.archive);
  router.post('/vehicles/:id/restore', requirePermission('vehicles:archive'), vehicles.restore);
  router.delete('/vehicles/:id', requirePermission('vehicles:delete'), vehicles.remove);

  router.post('/vehicles/:id/images', requirePermission('vehicles:images'), limiters.upload, imageUpload.array('photos', 10), vehicles.uploadImages);
  router.put('/vehicles/:id/images/order', requirePermission('vehicles:images'), vehicles.reorderImages);
  router.put('/vehicles/:id/images/:imageId/file', requirePermission('vehicles:images'), limiters.upload, imageUpload.single('photo'), vehicles.replaceImage);
  router.patch('/vehicles/:id/images/:imageId', requirePermission('vehicles:images'), vehicles.updateImage);
  router.delete('/vehicles/:id/images/:imageId', requirePermission('vehicles:images'), vehicles.deleteImage);

  router.get('/enquiries', requirePermission('enquiries:read'), admin.listEnquiries);
  router.get('/enquiries/assignees', requirePermission('enquiries:read'), admin.assignees);
  router.get('/enquiries/:id', requirePermission('enquiries:read'), admin.getEnquiry);
  router.patch('/enquiries/:id', requirePermission('enquiries:update'), admin.updateEnquiry);
  router.post('/enquiries/:id/notes', requirePermission('enquiries:update'), admin.addEnquiryNote);

  router.get('/staff', requirePermission('staff:manage'), admin.listStaff);
  router.post('/staff', requirePermission('staff:manage'), admin.inviteStaff);
  router.patch('/staff/:id', requirePermission('staff:manage'), admin.updateStaff);
  router.post('/staff/:id/setup-link', requirePermission('staff:manage'), admin.staffSetupLink);

  router.get('/settings', requirePermission('settings:manage'), admin.getSettings);
  router.put('/settings', requirePermission('settings:manage'), admin.putSettings);
  router.put('/settings/logo', requirePermission('settings:manage'), limiters.upload, imageUpload.single('logo'), admin.uploadLogo);
  router.delete('/settings/logo', requirePermission('settings:manage'), admin.deleteLogo);

  router.get('/audit-logs', requirePermission('audit:read'), admin.auditLogs);

  return router;
}
