/**
 * Structured JSON Logger with Zero-Image Scrubber & Privacy Guardrails
 * Enforces NDPA compliance & Working Rule 5: Zero selfie persistence, ever.
 */

// Regex patterns to detect and scrub base64 image strings and data URIs
const DATA_URI_IMAGE_REGEX = /data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/gi;
const LONG_BASE64_REGEX = /[A-Za-z0-9+/]{100,}={0,2}/g;

// Sensitive keys to scrub from logs
const SENSITIVE_KEYS = new Set([
  'pin',
  'pinhash',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'cookieheader',
  'apikey',
  'api-key',
  'imagebase64',
  'selfiebase64',
  'rawimage',
  'buffer',
]);

/**
 * Deeply scrubs any potential image data or secrets from an arbitrary value.
 */
export function scrubImageData<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    let scrubbed = value.replace(DATA_URI_IMAGE_REGEX, '[REDACTED_IMAGE_DATA]');
    scrubbed = scrubbed.replace(LONG_BASE64_REGEX, '[REDACTED_IMAGE_BLOB]');
    return scrubbed as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubImageData(item)) as unknown as T;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = lowerKey.includes('image') || lowerKey.includes('selfie')
          ? '[REDACTED_IMAGE_DATA]'
          : '[REDACTED_SECRET]';
      } else {
        result[key] = scrubImageData(val);
      }
    }
    return result as T;
  }

  return value;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: scrubImageData(message),
      context: context ? scrubImageData(context) : undefined,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: scrubImageData(error.message),
        stack: error.stack ? scrubImageData(error.stack) : undefined,
      };
    }

    return JSON.stringify(entry);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('DEBUG', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.formatLog('INFO', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.formatLog('WARN', message, context));
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : error ? new Error(String(error)) : undefined;
    console.error(this.formatLog('ERROR', message, context, err));
  }
}

export const logger = new StructuredLogger();
export default logger;
