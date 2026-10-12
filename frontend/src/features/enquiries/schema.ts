import { z } from 'zod';

const PHONE_PATTERN = /^\+?[\d\s\-()]{7,20}$/;

export const enquiryFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(80, 'Name is too long.'),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Enter a valid phone number, e.g. +233 24 123 4567.')
    .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number.'),
  email: z.union([z.literal(''), z.email('Enter a valid email address.').max(120)]),
  preferredContact: z.enum(['whatsapp', 'call', 'email']),
  message: z.string().trim().min(10, 'Please tell us a little more (at least 10 characters).').max(2000, 'Message is too long.'),
  consent: z.boolean().refine((v) => v, 'Please confirm you agree to the privacy notice.'),
  /** Honeypot — real visitors never see or fill this field. */
  website: z.string().max(0).optional(),
});

export type EnquiryFormValues = z.infer<typeof enquiryFormSchema>;
