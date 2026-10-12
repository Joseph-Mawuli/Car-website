import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: optionalString,
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_SITE_URL: z.string().url().default('http://localhost:5173'),
  /** Number of reverse-proxy hops in front of the API (needed for correct client IPs in rate limiting). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ENQUIRY_IP_SALT: z.string().min(16).optional(),

  FIREBASE_PROJECT_ID: optionalString,
  FIREBASE_CLIENT_EMAIL: optionalString,
  FIREBASE_PRIVATE_KEY: optionalString,
  /** Firebase *web* API key (public). Lets the API ask Firebase to send its built-in setup email when SMTP isn't configured. */
  FIREBASE_WEB_API_KEY: optionalString,

  /** Optional SMTP account for branded staff invitation emails (e.g. Resend, Brevo, Zoho, Google Workspace). */
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true for port 465 (implicit TLS); false uses STARTTLS on 587. */
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  /** e.g. "Goddel Motors <no-reply@yourdomain.com>" — the domain must be verified with your provider. */
  MAIL_FROM: optionalString,

  R2_ACCOUNT_ID: optionalString,
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET: optionalString,
  R2_PUBLIC_BASE_URL: optionalString,
  /**
   * Where new photos are stored. `r2` (default when R2 is configured) or `mongodb`, which keeps
   * photos in the database (GridFS) and serves them from this API — a stop-gap for small inventories.
   */
  STORAGE_DRIVER: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.enum(['r2', 'mongodb']).optional()),
  /** Public URL of this API (no trailing slash). Used to build photo links when STORAGE_DRIVER=mongodb. */
  PUBLIC_API_URL: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().url().optional()),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(12),
  MAX_IMAGES_PER_VEHICLE: z.coerce.number().int().positive().max(60).default(24),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === 'production') {
    const missing = (['MONGODB_URI', 'ENQUIRY_IP_SALT'] as const).filter((k) => !env[k]);
    if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
    if (env.STORAGE_DRIVER === 'mongodb' && !env.PUBLIC_API_URL) {
      throw new Error('PUBLIC_API_URL is required in production when STORAGE_DRIVER=mongodb (photo links point at this API).');
    }
  }
  return env;
}

export const env = loadEnv();

export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const isFirebaseConfigured = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

export const isSmtpConfigured = Boolean(env.SMTP_HOST && env.MAIL_FROM);

export const isR2Configured = Boolean(
  env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_PUBLIC_BASE_URL,
);

/** Storage used for new uploads, or undefined when none is configured. */
export const activeStorageDriver: 'r2' | 'mongodb' | undefined =
  env.STORAGE_DRIVER === 'mongodb' ? 'mongodb' : isR2Configured ? 'r2' : undefined;

export const publicApiUrl = (env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`).replace(/\/+$/, '');
