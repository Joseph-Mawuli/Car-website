export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;
  /** Safe to show to the client. Non-expose errors are replaced with a generic message. */
  readonly expose: boolean;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = status < 500;
  }
}

export const badRequest = (message: string, details?: Record<string, string[]>) => new AppError(400, 'bad_request', message, details);
export const unauthorized = (message = 'Authentication required.', code = 'unauthenticated') => new AppError(401, code, message);
export const forbidden = (message = 'You do not have permission to perform this action.') => new AppError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new AppError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict') => new AppError(409, code, message);
export const serviceUnavailable = (message: string, code = 'service_unavailable') => new AppError(503, code, message);
