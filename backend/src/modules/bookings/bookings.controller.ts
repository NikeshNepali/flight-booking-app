import type { Request, Response } from 'express';
import { parseOrThrow, sendSuccess } from '../../utils/http.js';
import type { BookingsService } from './bookings.service.js';
import { createBookingSchema, lookupSchema } from './bookings.validation.js';

export function createBookingsController(service: BookingsService) {
  return {
    async create(req: Request, res: Response) {
      const input = parseOrThrow(createBookingSchema, req.body);
      const result = await service.createBooking(input);
      res.setHeader('Cache-Control', 'no-store');
      sendSuccess(res, result.booking, result.httpStatus);
    },

    /** POST (not GET) so the secret token never appears in URLs, logs or browser history. */
    async lookup(req: Request, res: Response) {
      const { token } = parseOrThrow(lookupSchema, req.body);
      res.setHeader('Cache-Control', 'no-store');
      sendSuccess(res, await service.lookup(token));
    },
  };
}
