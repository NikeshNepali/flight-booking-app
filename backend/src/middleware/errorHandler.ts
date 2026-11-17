import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, ErrorCodes } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, ErrorCodes.NOT_FOUND, `Route ${req.method} ${req.path} not found.`));
};

// Express recognises error handlers by their 4-argument signature.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.warn('Request failed', { path: req.path, code: err.code, status: err.statusCode });
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  // Malformed JSON bodies from express.json()
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Request body is not valid JSON.' },
    });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      error: { code: ErrorCodes.VALIDATION_ERROR, message: 'Request body is too large.' },
    });
    return;
  }

  // Unknown errors: log the message/stack only (no request bodies), return a generic message.
  logger.error('Unhandled error', {
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    success: false,
    error: { code: ErrorCodes.INTERNAL_ERROR, message: 'Something went wrong. Please try again.' },
  });
};
