import { Router } from 'express';
import { airportLimiter, searchLimiter } from '../../middleware/rateLimit.js';
import { requireProvider } from '../../middleware/requireProvider.js';
import { asyncHandler } from '../../utils/http.js';
import type { FlightsService } from './flights.service.js';
import { createFlightsController } from './flights.controller.js';

export function createFlightsRouter(service: FlightsService) {
  const controller = createFlightsController(service);
  const router = Router();

  router.get('/airports', airportLimiter, requireProvider, asyncHandler(controller.airports));
  router.post('/flights/search', searchLimiter, requireProvider, asyncHandler(controller.search));
  router.get(
    '/flights/offer-requests/:offerRequestId/offers',
    searchLimiter,
    requireProvider,
    asyncHandler(controller.moreOffers),
  );
  router.get('/flights/offers/:offerId', requireProvider, asyncHandler(controller.offer));

  return router;
}
