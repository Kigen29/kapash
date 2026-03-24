import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

// ── Helper: normalize to string ─────────────────────────────────
function normalizeToString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0];
  return value ?? '';
}

// ── Recursive sanitizer ─────────────────────────────────────────
function sanitizeValue(value: any, depth = 0): any {
  if (depth > 10) return value;

  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(value)) {
    return value.map(v => sanitizeValue(v, depth + 1));
  }

  if (value && typeof value === 'object' && value.constructor === Object) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      clean[k] = sanitizeValue(v, depth + 1);
    }
    return clean;
  }

  return value;
}

// ── Malicious pattern detector ──────────────────────────────────
function containsMaliciousPattern(input: string | string[]): boolean {
  const patterns = [/\$where/i, /\$ne/i, /<script/i, /javascript:/i, /vbscript:/i];

  if (Array.isArray(input)) {
    return input.some(str => patterns.some(p => p.test(str)));
  }

  return patterns.some(p => p.test(input));
}

// ── MAIN SANITIZE MIDDLEWARE ────────────────────────────────────
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  try {
    // BODY
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);

      if (containsMaliciousPattern(bodyStr)) {
        return next(new AppError('Invalid input detected.', 400));
      }

      req.body = sanitizeValue(req.body);
    }

    // QUERY
    if (req.query) {
      const normalizedQuery: Record<string, string> = {};

      for (const [key, value] of Object.entries(req.query)) {
        normalizedQuery[key] = normalizeToString(value as any);
      }

      const queryStr = JSON.stringify(normalizedQuery);

      if (containsMaliciousPattern(queryStr)) {
        return next(new AppError('Invalid query detected.', 400));
      }

      req.query = sanitizeValue(normalizedQuery) as any;
    }

    // PARAMS (IMPORTANT FIX)
    if (req.params) {
      const normalizedParams: Record<string, string> = {};

      for (const [key, value] of Object.entries(req.params)) {
        normalizedParams[key] = normalizeToString(value as any);
      }

      req.params = normalizedParams; // 👈 force string-only
    }

    next();

  } catch {
    next(new AppError('Request processing failed.', 400));
  }
}

// ── Prevent HTTP Parameter Pollution ────────────────────────────
export function preventHPP(req: Request, _res: Response, next: NextFunction) {
  const whitelist = ['amenities', 'status', 'type'];

  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (Array.isArray(value) && !whitelist.includes(key)) {
        req.query[key] = value[value.length - 1];
      }
    }
  }

  next();
}

// ── UUID Validator (FULL FIX HERE) ──────────────────────────────
export function validateUuidParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const params = req.params as Record<string, string>; // 👈 FIX

    const val = params[paramName];

    if (
      val &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    ) {
      return next(new AppError(`Invalid ${paramName}.`, 400));
    }

    next();
  };
}