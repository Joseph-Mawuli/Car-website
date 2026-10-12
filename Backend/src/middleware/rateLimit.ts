import { rateLimit } from 'express-rate-limit';

function limiter(windowMinutes: number, limit: number, message: string) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({ error: { code: 'rate_limited', message } });
    },
  });
}

/** Created per app instance so each instance (and each test) has independent counters. */
export function createRateLimiters() {
  return {
    publicApi: limiter(15, 600, 'Too many requests. Please slow down and try again shortly.'),
    enquiry: limiter(10, 5, 'You have sent several enquiries in a short time. Please wait a few minutes and try again.'),
    adminApi: limiter(15, 1500, 'Too many requests. Please wait a moment and try again.'),
    upload: limiter(15, 120, 'Upload limit reached. Please wait a few minutes before uploading more photos.'),
    media: limiter(15, 5000, 'Too many photo requests. Please try again shortly.'),
  };
}

export type RateLimiters = ReturnType<typeof createRateLimiters>;
