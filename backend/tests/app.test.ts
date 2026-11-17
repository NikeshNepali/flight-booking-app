import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createBookingsService } from '../src/modules/bookings/bookings.service.js';
import { createFlightsService } from '../src/modules/flights/flights.service.js';
import { createWebhooksService } from '../src/modules/webhooks/webhooks.service.js';
import { addDays, todayUtc } from '../src/utils/dates.js';
import { createFakeProvider, createMemoryRepository } from './helpers.js';

function buildApp() {
  const repository = createMemoryRepository();
  const { provider } = createFakeProvider();
  const bookings = createBookingsService({ repository, provider, bookingsAllowed: true });
  return createApp({
    flights: createFlightsService(provider),
    bookings,
    webhooks: createWebhooksService({ secret: 's', expectedLiveMode: false, repository, bookings }),
    allowedOrigins: ['http://localhost:5173'],
    health: async () => ({ status: 'ok' }),
  });
}

describe('HTTP API', () => {
  const app = buildApp();

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
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fields.map((f: { path: string }) => f.path)).toContain(
      'departureDate',
    );
  });

  it('POST /api/flights/search returns mapped offers', async () => {
    const res = await request(app)
      .post('/api/flights/search')
      .send({
        origin: 'LHR',
        destination: 'JFK',
        departureDate: addDays(todayUtc(), 20),
        adults: 1,
      });
    expect(res.status).toBe(200);
    expect(res.body.data.offers[0].owner.name).toBe('Duffel Airways');
  });

  it('booking lookup is a non-cacheable POST returning 404 for unknown codes', async () => {
    const res = await request(app)
      .post('/api/bookings/lookup')
      .send({ token: 'x'.repeat(43) });
    expect(res.status).toBe(404);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.error.message).toBe('No booking matches this code.');
  });

  it('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
