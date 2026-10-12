import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import { logger } from '../config/logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: 'Not found.' } });
};

function zodDetails(err: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/** Converts every error into a consistent JSON shape without leaking internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Please check the highlighted fields.', details: zodDetails(err) } });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error('Request failed', { path: req.path, code: err.code, error: err });
    res.status(err.status).json({
      error: { code: err.code, message: err.expose ? err.message : 'Something went wrong.', ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'One of the photos is too large.'
        : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Too many files in one upload.'
          : 'The upload could not be processed.';
    res.status(status).json({ error: { code: 'upload_error', message } });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: { code: 'bad_request', message: 'Invalid identifier.' } });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [key, e] of Object.entries(err.errors)) details[key] = [e.message];
    res.status(400).json({ error: { code: 'validation_error', message: 'Please check the highlighted fields.', details } });
    return;
  }

  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({ error: { code: 'duplicate', message: 'A record with these details already exists.' } });
    return;
  }

  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_request', message: 'Malformed JSON body.' } });
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'payload_too_large', message: 'Request body is too large.' } });
    return;
  }

  logger.error('Unhandled error', { path: req.path, method: req.method, error: err });
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } });
};
