import type { StaffPrincipal } from '../middleware/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` after the Firebase token and staff record are verified. */
      staff?: StaffPrincipal;
    }
  }
}

export {};
