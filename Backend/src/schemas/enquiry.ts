import { z } from 'zod';
import { ENQUIRY_STATUSES, PREFERRED_CONTACT } from '../types/domain.js';
import { cleanText, objectId, pageQuery, PHONE_PATTERN } from './common.js';

export const createEnquirySchema = z.object({
  name: cleanText(80).pipe(z.string().min(2, 'Please enter your name.')),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Enter a valid phone number.')
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number.'),
  email: z
    .union([z.literal(''), z.email('Enter a valid email address.').max(120)])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined)),
  message: cleanText(2000).pipe(z.string().min(10, 'Please write a little more (at least 10 characters).')),
  vehicleId: objectId.optional(),
  preferredContact: z.enum(PREFERRED_CONTACT).optional(),
  consent: z.literal(true, { error: 'Consent to the privacy notice is required.' }),
  /** Honeypot and form-timing fields used for spam detection. */
  website: z.string().max(200).optional(),
  startedAt: z.number().int().positive().optional(),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const adminEnquiryQuery = z.object({
  q: z.string().trim().max(60).optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  assigned: z.union([z.literal('me'), z.literal('unassigned'), objectId]).optional(),
  ...pageQuery,
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminEnquiryQuery = z.infer<typeof adminEnquiryQuery>;

export const updateEnquirySchema = z
  .object({
    status: z.enum(ENQUIRY_STATUSES).optional(),
    assignedTo: z.union([objectId, z.null()]).optional(),
  })
  .refine((v) => v.status !== undefined || v.assignedTo !== undefined, 'Nothing to update.');
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;

export const addNoteSchema = z.object({ body: cleanText(2000).pipe(z.string().min(1, 'Note cannot be empty.')) });
