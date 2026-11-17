import type { Request, Response } from 'express';
import { parseOrThrow, sendSuccess } from '../../utils/http.js';
import type { FlightsService } from './flights.service.js';
import {
  airportQuerySchema,
  listOffersSchema,
  offerIdParamsSchema,
  searchSchema,
} from './flights.validation.js';

export function createFlightsController(service: FlightsService) {
  return {
    async airports(req: Request, res: Response) {
      const { query } = parseOrThrow(airportQuerySchema, req.query);
      sendSuccess(res, await service.searchAirports(query));
    },

    async search(req: Request, res: Response) {
      const input = parseOrThrow(searchSchema, req.body);
      sendSuccess(res, await service.searchFlights(input));
    },

    async moreOffers(req: Request, res: Response) {
      const { offerRequestId, after } = parseOrThrow(listOffersSchema, {
        offerRequestId: req.params.offerRequestId,
        after: req.query.after,
      });
      sendSuccess(res, await service.loadMoreOffers(offerRequestId, after));
    },

    async offer(req: Request, res: Response) {
      const { offerId } = parseOrThrow(offerIdParamsSchema, req.params);
      sendSuccess(res, await service.getOffer(offerId));
    },
  };
}
