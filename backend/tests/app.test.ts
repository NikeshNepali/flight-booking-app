import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { mapOffer } from '../src/integrations/duffel/duffel.mappers.js';
import { createFlightsService } from '../src/modules/flights/flights.service.js';
import type { FlightProvider } from '../src/types/provider.js';
import { addDays, todayUtc } from '../src/utils/dates.js';
import { makeDuffelOffer } from './fixtures/duffelOffer.js';

const notUsed = async (): Promise<never> => {
  throw new Error('not used in these tests');
};

const provider: FlightProvider = {
  name: 'duffel',
  searchPlaces: async () => [],
  searchOffers: async () => ({ offerRequestId: 'orq_1', offers: [mapOffer(makeDuffelOffer())], nextCursor: null }),
  listOffers: async () => ({ offerRequestId: 'orq_1', offers: [], nextCursor: null }),
  getOffer: async () => mapOffer(makeDuffelOffer()),
  createOrder: notUsed,
  getOrder: notUsed,
};

const app = createApp({
  flights: createFlightsService(provider),
  allowedOrigins: ['http://localhost:5173'],
  health: async () => ({ status: 'ok' }),
});

describe('HTTP API', () => {
  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('returns field-level validation errors in a consistent envelope', async () => {
    const res = await request(app)
      .post('/api/flights/search')
      .send({ origin: 'LHR', destination: 'LHR', adults: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fields.map((f: { path: string }) => f.path)).toContain('departureDate');
  });

  it('POST /api/flights/search returns mapped offers', async () => {
    const res = await request(app)
      .post('/api/flights/search')
      .send({ origin: 'LHR', destination: 'JFK', departureDate: addDays(todayUtc(), 20), adults: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.offers[0].owner.name).toBe('Duffel Airways');
  });

  it('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
