type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = process.env.NODE_ENV === 'test' ? 'error' : process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/** Keys whose values must never reach log output. */
const REDACT = /authorization|token|password|secret|private.?key|cookie|phone|email/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, REDACT.test(k) ? '[redacted]' : redact(v, depth + 1)]),
  );
}

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...(meta ? (redact(meta) as object) : {}) });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
