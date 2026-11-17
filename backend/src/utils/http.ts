import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError, ErrorCodes } from './AppError.js';

/** Consistent success envelope: { success: true, data }. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

/** Parses input with a Zod schema, throwing a 400 AppError with field details. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Some fields are invalid.', {
      fields: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
