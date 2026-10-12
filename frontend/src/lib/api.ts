import { config } from './config';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  signal?: AbortSignal;
}

export type MockHandler = (path: string, options: RequestOptions & { formData?: FormData }) => Promise<unknown>;

let tokenProvider: TokenProvider | null = null;
let mockHandler: MockHandler | null = null;
let unauthorizedHandler: ((error: ApiError) => void) | null = null;

/** Called when an authenticated request is rejected with 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void {
  unauthorizedHandler = handler;
}

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export function setMockHandler(handler: MockHandler | null): void {
  mockHandler = handler;
}

export function isMockApiActive(): boolean {
  return mockHandler !== null;
}

export function buildQuery(query: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function authHeader(forceRefresh = false): Promise<Record<string, string>> {
  if (!tokenProvider) throw new ApiError(401, 'unauthenticated', 'Please sign in to continue.');
  const token = await tokenProvider(forceRefresh);
  if (!token) throw new ApiError(401, 'unauthenticated', 'Please sign in to continue.');
  return { Authorization: `Bearer ${token}` };
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: { error?: { code?: string; message?: string; details?: Record<string, string[]> } } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }
  const err = payload.error ?? {};
  return new ApiError(
    res.status,
    err.code ?? 'request_failed',
    err.message ?? (res.status >= 500 ? 'The server is unavailable. Please try again shortly.' : 'Request failed.'),
    err.details,
  );
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (mockHandler) return (await mockHandler(path, options)) as T;

  const { method = 'GET', body, query, auth = false, signal } = options;
  const url = `${config.apiBaseUrl}/api/v1${path}${buildQuery(query)}`;

  const send = async (forceRefresh: boolean): Promise<Response> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) Object.assign(headers, await authHeader(forceRefresh));
    try {
      return await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
        credentials: 'omit',
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new ApiError(0, 'network_error', 'Unable to reach the server. Check your connection and try again.');
    }
  };

  let res = await send(false);
  // A token can expire between the client check and the server check; retry once with a fresh token.
  if (auth && res.status === 401) res = await send(true);
  if (!res.ok) {
    const error = await parseError(res);
    if (auth && res.status === 401) unauthorizedHandler?.(error);
    throw error;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart upload with progress reporting (fetch has no upload progress events). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  { method = 'POST', onProgress }: { method?: 'POST' | 'PUT'; onProgress?: (fraction: number) => void } = {},
): Promise<T> {
  if (mockHandler) {
    onProgress?.(1);
    return (await mockHandler(path, { method, auth: true, formData })) as T;
  }
  const headers = await authHeader();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${config.apiBaseUrl}/api/v1${path}`);
    xhr.setRequestHeader('Authorization', headers.Authorization);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, 'network_error', 'Upload failed. Check your connection and try again.'));
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
      } else {
        const err = (payload as { error?: { code?: string; message?: string } } | null)?.error ?? {};
        reject(new ApiError(xhr.status, err.code ?? 'upload_failed', err.message ?? 'Upload failed.'));
      }
    };
    xhr.send(formData);
  });
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}
