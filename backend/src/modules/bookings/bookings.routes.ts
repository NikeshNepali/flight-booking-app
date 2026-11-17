import { Router } from 'express';
import { bookingLimiter, lookupLimiter } from '../../middleware/rateLimit.js';
import { requireProvider } from '../../middleware/requireProvider.js';
import { asyncHandler } from '../../utils/http.js';
import { createBookingsController } from './bookings.controller.js';
import type { BookingsService } from './bookings.service.js';

export function createBookingsRouter(service: BookingsService) {
  const controller = createBookingsController(service);
  const router = Router();
  router.post('/bookings', bookingLimiter, requireProvider, asyncHandler(controller.create));
  router.post('/bookings/lookup', lookupLimiter, asyncHandler(controller.lookup));
  return router;
}
