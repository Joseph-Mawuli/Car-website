import { createApp } from '../src/app.js';
import { TokenExpiredError, type StaffPrincipal } from '../src/middleware/auth.js';

export const STAFF: Record<string, StaffPrincipal> = {
  'owner-token': { id: '64b000000000000000000001', uid: 'uid-owner', email: 'owner@test.local', displayName: 'Owner', role: 'owner', status: 'active' },
  'inventory-token': { id: '64b000000000000000000002', uid: 'uid-inv', email: 'inv@test.local', displayName: 'Inventory', role: 'inventory_manager', status: 'active' },
  'sales-token': { id: '64b000000000000000000003', uid: 'uid-sales', email: 'sales@test.local', displayName: 'Sales', role: 'sales_assistant', status: 'active' },
  'disabled-token': { id: '64b000000000000000000004', uid: 'uid-disabled', email: 'gone@test.local', displayName: 'Former', role: 'owner', status: 'disabled' },
};

/** Fake Firebase verifier: maps fixed tokens to identities; anything else is invalid. */
export function buildTestApp() {
  return createApp({
    isDatabaseReady: () => true,
    auth: {
      verifyIdToken: async (token) => {
        if (token === 'expired-token') throw new TokenExpiredError('expired');
        if (token === 'stranger-token') return { uid: 'uid-stranger', email: 'stranger@test.local' };
        const staff = STAFF[token];
        if (!staff) throw new Error('invalid token');
        return { uid: staff.uid, email: staff.email };
      },
      findStaffByUid: async (uid) => Object.values(STAFF).find((s) => s.uid === uid) ?? null,
    },
  });
}

export const VEHICLE_ID = '64c000000000000000000001';
export const IMAGE_ID = '64d000000000000000000001';
export const ENQUIRY_ID = '64e000000000000000000001';
export const STAFF_ID = '64b000000000000000000009';
