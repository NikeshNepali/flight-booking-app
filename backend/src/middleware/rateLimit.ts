import { rateLimit } from 'express-rate-limit';
import { ErrorCodes } from '../utils/AppError.js';

function limiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: { code: ErrorCodes.RATE_LIMITED, message } });
    },
  });
}

export const apiLimiter = limiter(15 * 60_000, 600, 'Too many requests. Please slow down.');
export const airportLimiter = limiter(
  60_000,
  120,
  'Too many airport lookups. Please wait a moment.',
);
export const searchLimiter = limiter(60_000, 20, 'Too many searches. Please wait a minute.');
export const bookingLimiter = limiter(15 * 60_000, 10, 'Too many booking attempts. Please wait.');
export const lookupLimiter = limiter(15 * 60_000, 30, 'Too many lookup attempts. Please wait.');
