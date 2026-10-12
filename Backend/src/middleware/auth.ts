import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { forbidden, serviceUnavailable, unauthorized } from '../lib/errors.js';
import { hasPermission, ROLE_PERMISSIONS, type Permission, type Role } from '../lib/permissions.js';
import type { StaffStatus } from '../types/domain.js';

export interface StaffPrincipal {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  status: StaffStatus;
}

export interface VerifiedToken {
  uid: string;
  email?: string;
}

export interface AuthDeps {
  /** Verifies a Firebase ID token (signature, expiry, revocation). Throws on failure. */
  verifyIdToken: (token: string) => Promise<VerifiedToken>;
  findStaffByUid: (uid: string) => Promise<StaffPrincipal | null>;
}

export class TokenExpiredError extends Error {}
export class AuthNotConfiguredError extends Error {}

/**
 * Authenticates every admin request: a valid, unrevoked Firebase ID token AND an
 * active staff record in our database are both required. Disabling a staff member
 * in the database therefore blocks access immediately, even with an unexpired token.
 */
export function authenticate(deps: AuthDeps): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.get('authorization') ?? '';
    const match = /^Bearer\s+([A-Za-z0-9\-_.]+)$/.exec(header);
    if (!match) return next(unauthorized());

    let token: VerifiedToken;
    try {
      token = await deps.verifyIdToken(match[1]);
    } catch (err) {
      if (err instanceof AuthNotConfiguredError) return next(serviceUnavailable('Staff sign-in is not configured on the server.', 'auth_not_configured'));
      if (err instanceof TokenExpiredError) return next(unauthorized('Your session has expired. Please sign in again.', 'session_expired'));
      return next(unauthorized('Your session is invalid. Please sign in again.', 'invalid_token'));
    }

    const staff = await deps.findStaffByUid(token.uid);
    if (!staff) return next(forbidden('This account is not authorised to access the dashboard.'));
    if (staff.status !== 'active') return next(forbidden('This account has been disabled. Contact the dealership owner.'));

    req.staff = staff;
    next();
  };
}

export function requirePermission(...permissions: Permission[]): RequestHandler {
  return (req, _res, next) => {
    const staff = req.staff;
    if (!staff) return next(unauthorized());
    const allowed = permissions.every((p) => hasPermission(staff.role, p));
    if (!allowed) return next(forbidden());
    next();
  };
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
