import { z } from 'zod';
import { ROLES } from '../lib/permissions.js';
import { STAFF_STATUSES } from '../types/domain.js';
import { cleanText } from './common.js';

export const inviteStaffSchema = z.object({
  email: z.email('Enter a valid email address.').max(120).transform((v) => v.toLowerCase()),
  displayName: cleanText(80).pipe(z.string().min(2, 'Enter a name.')),
  role: z.enum(ROLES),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateStaffSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    status: z.enum(STAFF_STATUSES).optional(),
    displayName: cleanText(80).pipe(z.string().min(2)).optional(),
  })
  .refine((v) => v.role || v.status || v.displayName, 'Nothing to update.');
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
