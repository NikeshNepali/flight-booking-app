import { randomUUID } from 'node:crypto';
import type { BookingRow, PassengerRow } from '../src/db/schema/index.js';
import { mapOffer, mapOrder } from '../src/integrations/duffel/duffel.mappers.js';
import type {
  BookingsRepository,
  BookingWithPassengers,
} from '../src/modules/bookings/bookings.repository.js';
import type { FlightProvider } from '../src/types/provider.js';
import { makeDuffelOffer, makeDuffelOrder } from './fixtures/duffelOffer.js';

/** In-memory stand-in for the PostgreSQL repository. */
export function createMemoryRepository(): BookingsRepository & {
  bookings: BookingRow[];
  passengers: PassengerRow[];
  events: { providerEventId: string; eventType: string; bookingId: string | null }[];
} {
  const bookings: BookingRow[] = [];
  const passengers: PassengerRow[] = [];
  const events: { providerEventId: string; eventType: string; bookingId: string | null }[] = [];
  const withPassengers = (b?: BookingRow): BookingWithPassengers | null =>
    b ? { booking: { ...b }, passengers: passengers.filter((p) => p.bookingId === b.id) } : null;

  return {
    bookings,
    passengers,
    events,
    async findById(id) {
      return withPassengers(bookings.find((b) => b.id === id));
    },
    async findByIdempotencyKey(key) {
      return withPassengers(bookings.find((b) => b.idempotencyKey === key));
    },
    async findByLookupTokenHash(hash) {
      return withPassengers(bookings.find((b) => b.lookupTokenHash === hash));
    },
    async findByProviderOrderId(id) {
      return withPassengers(bookings.find((b) => b.providerOrderId === id));
    },
    async createPending(booking, rows) {
      if (bookings.some((b) => b.idempotencyKey === booking.idempotencyKey)) return null;
      const now = new Date();
      const row: BookingRow = {
        id: randomUUID(),
        provider: 'duffel',
        providerOrderId: null,
        bookingReference: null,
        status: 'pending',
        paymentStatus: 'pending',
        ticketingStatus: 'not_issued',
        itinerarySnapshot: null,
        failureCode: null,
        failureMessage: null,
        createdAt: now,
        updatedAt: now,
        ...booking,
      } as BookingRow;
      bookings.push(row);
      for (const p of rows) {
        passengers.push({
          id: randomUUID(),
          bookingId: row.id,
          createdAt: now,
          title: null,
          ...p,
        } as PassengerRow);
      }
      return withPassengers(row);
    },
    async update(id, changes) {
      const row = bookings.find((b) => b.id === id);
      if (!row) return null;
      Object.assign(row, changes, { updatedAt: new Date() });
      return withPassengers(row);
    },
    async hasEvent(id) {
      return events.some((e) => e.providerEventId === id);
    },
    async recordEvent(providerEventId, eventType, bookingId) {
      if (events.some((e) => e.providerEventId === providerEventId)) return false;
      events.push({ providerEventId, eventType, bookingId });
      return true;
    },
  };
}

/** A fake provider returning mapped mock Duffel data; override methods per test. */
export function createFakeProvider(overrides: Partial<FlightProvider> = {}) {
  const calls = { createOrder: 0, getOffer: 0, getOrder: 0 };
  const provider: FlightProvider = {
    name: 'duffel',
    async searchPlaces() {
      return [];
    },
    async searchOffers() {
      return { offerRequestId: 'orq_1', offers: [mapOffer(makeDuffelOffer())], nextCursor: null };
    },
    async listOffers() {
      return { offerRequestId: 'orq_1', offers: [], nextCursor: null };
    },
    async getOffer() {
      calls.getOffer += 1;
      return mapOffer(makeDuffelOffer());
    },
    async createOrder() {
      calls.createOrder += 1;
      return mapOrder(makeDuffelOrder());
    },
    async getOrder() {
      calls.getOrder += 1;
      return mapOrder(makeDuffelOrder());
    },
    ...overrides,
  };
  return { provider, calls };
}

export function bookingInput(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    offerId: 'off_0000TestOffer1',
    expectedTotal: { amount: '450.20', currency: 'GBP' },
    acceptedConditions: true as const,
    contact: { email: 'Traveller@Example.com', phone: '+442080160509' },
    passengers: [
      {
        id: 'pas_adult1',
        title: 'ms' as const,
        gender: 'f' as const,
        givenName: 'Amelia',
        familyName: 'Earhart',
        bornOn: '1987-07-24',
      },
      // 8 years old on 2027-03-15 (the fixture's departure date)
      {
        id: 'pas_child1',
        title: 'miss' as const,
        gender: 'f' as const,
        givenName: 'Ada',
        familyName: 'Earhart',
        bornOn: '2018-06-01',
      },
    ],
    ...overrides,
  };
}
