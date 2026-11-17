import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError, ErrorCodes } from '../utils/AppError.js';

/** Returns a clear configuration error when the Duffel token has not been set. */
export const requireProvider: RequestHandler = (_req, _res, next) => {
  if (!env.DUFFEL_ACCESS_TOKEN) {
    next(
      new AppError(
        503,
        ErrorCodes.CONFIG_ERROR,
        'Flight provider is not configured. Set DUFFEL_ACCESS_TOKEN (in backend/.env locally, or in your hosting environment variables) to a Duffel test token starting with "duffel_test_", then restart the server.',
      ),
    );
    return;
  }
  next();
};
