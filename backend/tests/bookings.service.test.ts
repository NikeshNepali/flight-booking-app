import { describe, expect, it } from 'vitest';
import { mapOffer, mapOrder } from '../src/integrations/duffel/duffel.mappers.js';
import { createBookingsService } from '../src/modules/bookings/bookings.service.js';
import { AppError, ErrorCodes } from '../src/utils/AppError.js';
import { hashToken } from '../src/utils/crypto.js';
import { makeDuffelOffer, makeDuffelOrder } from './fixtures/duffelOffer.js';
import { bookingInput, createFakeProvider, createMemoryRepository } from './helpers.js';

function setup(providerOverrides = {}, bookingsAllowed = true) {
  const repository = createMemoryRepository();
  const { provider, calls } = createFakeProvider(providerOverrides);
  const service = createBookingsService({ repository, provider, bookingsAllowed });
  return { repository, calls, service };
}

async function expectAppError(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
  return error as AppError;
}

describe('createBooking', () => {
  it('confirms only after the provider creates the order, and stores a token hash', async () => {
    const { service, repository, calls } = setup();
    const result = await service.createBooking(bookingInput());

    expect(result.httpStatus).toBe(201);
    expect(result.booking.status).toBe('confirmed');
    expect(result.booking.bookingReference).toBe('RZPNX8');
    expect(result.booking.providerOrderId).toBe('ord_0000TestOrder1');
    expect(result.booking.ticketingStatus).toBe('not_issued');
    expect(result.booking.lookupToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(calls.createOrder).toBe(1);

    const row = repository.bookings[0]!;
    expect(row.lookupTokenHash).toBe(hashToken(result.booking.lookupToken!));
    expect(row.contactEmail).toBe('traveller@example.com');
    expect(repository.passengers).toHaveLength(2);
  });

  it('marks the booking ticketed when e-tickets are present', async () => {
    const { service } = setup({
      createOrder: async () =>
        mapOrder(
          makeDuffelOrder({
            documents: [
              {
                type: 'electronic_ticket',
                unique_identifier: '1252212250',
                passenger_ids: ['pas_adult1'],
              },
            ],
          }),
        ),
    });
    const { booking } = await service.createBooking(bookingInput());
    expect(booking.ticketingStatus).toBe('issued');
    expect(booking.passengers[0]!.ticketNumbers).toEqual(['1252212250']);
  });

  it('never calls the provider twice for the same idempotency key', async () => {
    const { service, calls, repository } = setup();
    const input = bookingInput();
    const first = await service.createBooking(input);
    const second = await service.createBooking(input);

    expect(calls.createOrder).toBe(1);
    expect(repository.bookings).toHaveLength(1);
    expect(second.booking.providerOrderId).toBe(first.booking.providerOrderId);
    // A fresh token is issued on replay; the old one no longer works.
    expect(second.booking.lookupToken).not.toBe(first.booking.lookupToken);
    await expectAppError(service.lookup(first.booking.lookupToken!), ErrorCodes.NOT_FOUND);
    await expect(service.lookup(second.booking.lookupToken!)).resolves.toMatchObject({
      status: 'confirmed',
    });
  });

  it('rejects when the latest price differs from what the user saw', async () => {
    const { service, calls } = setup({
      getOffer: async () => mapOffer(makeDuffelOffer({ total_amount: '499.99' })),
    });
    const error = await expectAppError(
      service.createBooking(bookingInput()),
      ErrorCodes.PRICE_CHANGED,
    );
    expect(error.details).toEqual({ totalAmount: '499.99', totalCurrency: 'GBP' });
    expect(calls.createOrder).toBe(0);
  });

  it('propagates expired offers without creating a booking', async () => {
    const { service, repository } = setup({
      getOffer: async () => {
        throw new AppError(410, ErrorCodes.OFFER_EXPIRED, 'expired');
      },
    });
    await expectAppError(service.createBooking(bookingInput()), ErrorCodes.OFFER_EXPIRED);
    expect(repository.bookings).toHaveLength(0);
  });

  it('validates passenger ages against the offer', async () => {
    const { service, calls } = setup();
    const input = bookingInput();
    input.passengers[1]!.bornOn = '2012-01-01'; // 15, but searched as 8
    const error = await expectAppError(service.createBooking(input), ErrorCodes.INVALID_PASSENGERS);
    expect(JSON.stringify(error.details)).toContain('pas_child1');
    expect(calls.createOrder).toBe(0);
  });

  it('requires passports only when the airline does, and strips them otherwise', async () => {
    let sentDocuments: unknown;
    const { service } = setup({
      createOrder: async (input: { passengers: { identityDocument?: unknown }[] }) => {
        sentDocuments = input.passengers.map((p) => p.identityDocument);
        return mapOrder(makeDuffelOrder());
      },
    });
    const input = bookingInput();
    (input.passengers[0] as Record<string, unknown>).identityDocument = {
      type: 'passport',
      uniqueIdentifier: 'AB12345',
      issuingCountryCode: 'GB',
      expiresOn: '2030-01-01',
    };
    await service.createBooking(input);
    expect(sentDocuments).toEqual([undefined, undefined]);

    const strict = setup({
      getOffer: async () =>
        mapOffer(makeDuffelOffer({ passenger_identity_documents_required: true })),
    });
    await expectAppError(
      strict.service.createBooking(bookingInput()),
      ErrorCodes.INVALID_PASSENGERS,
    );
  });

  it('marks the booking failed when the provider definitively rejects the order', async () => {
    const { service, repository } = setup({
      createOrder: async () => {
        throw new AppError(402, ErrorCodes.PAYMENT_FAILED, 'Insufficient balance');
      },
    });
    await expectAppError(service.createBooking(bookingInput()), ErrorCodes.PAYMENT_FAILED);
    expect(repository.bookings[0]).toMatchObject({
      status: 'failed',
      paymentStatus: 'failed',
      providerOrderId: null,
    });
  });

  it('keeps the booking pending (not failed, not confirmed) when the outcome is unknown', async () => {
    const { service, repository } = setup({
      createOrder: async () => {
        throw Object.assign(new AppError(504, ErrorCodes.PROVIDER_TIMEOUT, 'timeout'), {
          uncertain: true,
        });
      },
    });
    const result = await service.createBooking(bookingInput());
    expect(result.httpStatus).toBe(202);
    expect(result.booking.status).toBe('pending');
    expect(result.booking.lookupToken).toBeDefined();
    expect(repository.bookings[0]!.failureCode).toBe('OUTCOME_UNKNOWN');
  });

  it('refuses to book when bookings are disabled (live mode without the switch)', async () => {
    const { service, calls } = setup({}, false);
    await expectAppError(service.createBooking(bookingInput()), ErrorCodes.BOOKINGS_DISABLED);
    expect(calls.getOffer).toBe(0);
  });
});

describe('syncOrder', () => {
  it('confirms a pending booking via order metadata (e.g. after a timeout)', async () => {
    let bookingId = '';
    const { service, repository } = setup({
      createOrder: async () => {
        throw Object.assign(new AppError(504, ErrorCodes.PROVIDER_TIMEOUT, 'timeout'), {
          uncertain: true,
        });
      },
      getOrder: async () => mapOrder(makeDuffelOrder({ metadata: { booking_id: bookingId } })),
    });
    await service.createBooking(bookingInput());
    bookingId = repository.bookings[0]!.id;

    await expect(service.syncOrder('ord_0000TestOrder1')).resolves.toBe(bookingId);
    expect(repository.bookings[0]).toMatchObject({
      status: 'confirmed',
      bookingReference: 'RZPNX8',
    });
  });

  it('marks cancelled orders as cancelled', async () => {
    const { service, repository } = setup({
      getOrder: async () => mapOrder(makeDuffelOrder({ cancelled_at: '2026-12-01T00:00:00Z' })),
    });
    await service.createBooking(bookingInput());
    await service.syncOrder('ord_0000TestOrder1');
    expect(repository.bookings[0]!.status).toBe('cancelled');
  });
});
