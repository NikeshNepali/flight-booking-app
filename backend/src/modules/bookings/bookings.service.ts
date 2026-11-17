import type { BookingRow, PassengerRow } from '../../db/schema/index.js';
import type { BookingView, ItinerarySnapshot, ProviderOrder } from '../../types/booking.js';
import type { FlightProvider } from '../../types/provider.js';
import { AppError, ErrorCodes } from '../../utils/AppError.js';
import { generateLookupToken, hashToken } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import { preparePassengers } from './bookings.passengers.js';
import type {
  BookingsRepository,
  BookingUpdate,
  BookingWithPassengers,
} from './bookings.repository.js';
import type { CreateBookingInput } from './bookings.validation.js';

export interface BookingResult {
  /** 201 = confirmed by provider, 202 = outcome not yet known (still pending). */
  httpStatus: 201 | 202;
  booking: BookingView;
}

/** Converts a provider order into the columns we store. Used on creation, lookup refresh and webhooks. */
export function bookingUpdateFromOrder(order: ProviderOrder): BookingUpdate {
  const snapshot: ItinerarySnapshot = {
    owner: order.owner,
    slices: order.slices,
    baseAmount: order.baseAmount,
    taxAmount: order.taxAmount,
    conditions: order.conditions,
    tickets: order.tickets,
    cancelledAt: order.cancelledAt,
    paymentRequiredBy: order.paymentRequiredBy,
  };
  return {
    providerOrderId: order.id,
    bookingReference: order.bookingReference,
    status: order.cancelledAt ? 'cancelled' : 'confirmed',
    paymentStatus: order.awaitingPayment ? 'awaiting_payment' : 'paid',
    ticketingStatus: order.tickets.length > 0 ? 'issued' : 'not_issued',
    totalAmount: order.totalAmount,
    currency: order.totalCurrency,
    itinerarySnapshot: snapshot,
    failureCode: null,
    failureMessage: null,
  };
}

export function toBookingView(
  { booking, passengers }: { booking: BookingRow; passengers: PassengerRow[] },
  lookupToken?: string,
): BookingView {
  const tickets = booking.itinerarySnapshot?.tickets ?? [];
  return {
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    ticketingStatus: booking.ticketingStatus,
    provider: booking.provider,
    providerOrderId: booking.providerOrderId,
    bookingReference: booking.bookingReference,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    liveMode: booking.liveMode,
    contactEmail: booking.contactEmail,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    itinerary: booking.itinerarySnapshot ?? null,
    passengers: passengers.map((p) => ({
      providerPassengerId: p.providerPassengerId,
      title: p.title,
      givenName: p.givenName,
      familyName: p.familyName,
      dateOfBirth: p.dateOfBirth,
      passengerType: p.passengerType,
      ticketNumbers: tickets
        .filter((t) => t.passengerIds.includes(p.providerPassengerId))
        .map((t) => t.ticketNumber),
    })),
    failure:
      booking.failureCode || booking.failureMessage
        ? { code: booking.failureCode, message: booking.failureMessage }
        : null,
    ...(lookupToken ? { lookupToken } : {}),
  };
}

function sameAmount(a: string, b: string): boolean {
  return Number(a) === Number(b);
}

const LOOKUP_REFRESH_INTERVAL_MS = 60_000;

export function createBookingsService(deps: {
  repository: BookingsRepository;
  provider: FlightProvider;
  bookingsAllowed: boolean;
}) {
  const { repository, provider, bookingsAllowed } = deps;

  /**
   * Replays a request whose idempotency key we have already seen. The original lookup
   * token cannot be recovered (we only store its hash), so a fresh one is issued — only
   * the browser that generated the random idempotency key can do this.
   */
  async function replay(existing: BookingWithPassengers, offerId: string): Promise<BookingResult> {
    if (existing.booking.providerOfferId !== offerId) {
      throw new AppError(
        409,
        ErrorCodes.VALIDATION_ERROR,
        'This checkout key was already used for another offer.',
      );
    }
    if (existing.booking.status === 'failed') {
      throw new AppError(
        409,
        ErrorCodes.BOOKING_FAILED,
        existing.booking.failureMessage ?? 'The previous booking attempt failed. Please try again.',
        { providerCode: existing.booking.failureCode },
      );
    }
    const token = generateLookupToken();
    const updated = await repository.update(existing.booking.id, {
      lookupTokenHash: hashToken(token),
    });
    const view = toBookingView(updated ?? existing, token);
    return { httpStatus: existing.booking.status === 'pending' ? 202 : 201, booking: view };
  }

  return {
    async createBooking(input: CreateBookingInput): Promise<BookingResult> {
      if (!bookingsAllowed) {
        throw new AppError(
          403,
          ErrorCodes.BOOKINGS_DISABLED,
          'Live bookings are disabled. Set DUFFEL_LIVE_BOOKINGS_ENABLED=true only when you are ready to create real orders.',
        );
      }

      // 1. Duplicate submission? Never call the provider twice for the same checkout.
      const existing = await repository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return replay(existing, input.offerId);

      // 2. Re-check the offer with the provider: availability, expiry, current price.
      const offer = await provider.getOffer(input.offerId);
      if (
        offer.totalCurrency !== input.expectedTotal.currency ||
        !sameAmount(offer.totalAmount, input.expectedTotal.amount)
      ) {
        throw new AppError(
          409,
          ErrorCodes.PRICE_CHANGED,
          'The price of this flight has changed. Please review the new total.',
          {
            totalAmount: offer.totalAmount,
            totalCurrency: offer.totalCurrency,
          },
        );
      }

      // 3. Validate passengers against the offer (ages, documents, completeness).
      const passengers = preparePassengers(offer, input.passengers);

      // 4. Persist a pending booking first, so a crash after the provider call is recoverable.
      const lookupToken = generateLookupToken();
      const created = await repository.createPending(
        {
          idempotencyKey: input.idempotencyKey,
          provider: provider.name,
          providerOfferId: offer.id,
          lookupTokenHash: hashToken(lookupToken),
          contactEmail: input.contact.email.toLowerCase(),
          contactPhone: input.contact.phone,
          status: 'pending',
          paymentStatus: 'pending',
          totalAmount: offer.totalAmount,
          currency: offer.totalCurrency,
          liveMode: offer.liveMode,
        },
        passengers.map((p) => ({
          providerPassengerId: p.id,
          title: p.title,
          givenName: p.givenName,
          familyName: p.familyName,
          dateOfBirth: p.bornOn,
          passengerType: offer.passengers.find((o) => o.id === p.id)?.type ?? 'adult',
        })),
      );
      if (!created) {
        // Lost a race with an identical concurrent request.
        const winner = await repository.findByIdempotencyKey(input.idempotencyKey);
        if (winner) return replay(winner, input.offerId);
        throw new AppError(
          409,
          ErrorCodes.BOOKING_IN_PROGRESS,
          'This booking is already being processed.',
        );
      }
      const bookingId = created.booking.id;

      // 5. Create the airline order with the provider.
      let order: ProviderOrder;
      try {
        order = await provider.createOrder({
          offer,
          passengers,
          contact: input.contact,
          bookingId,
        });
      } catch (error) {
        const appError =
          error instanceof AppError
            ? error
            : new AppError(502, ErrorCodes.BOOKING_FAILED, 'Booking failed.');
        if ((error as { uncertain?: boolean }).uncertain) {
          // We don't know whether the airline created the order. Keep it pending: the
          // order.created webhook (matched via metadata.booking_id) or support will resolve it.
          logger.warn('Order outcome unknown', { bookingId, code: appError.code });
          const pending = await repository.update(bookingId, {
            failureCode: 'OUTCOME_UNKNOWN',
            failureMessage:
              'We could not confirm the booking with the airline yet. Do not book again — check the status with your booking code shortly.',
          });
          return { httpStatus: 202, booking: toBookingView(pending ?? created, lookupToken) };
        }
        await repository.update(bookingId, {
          status: 'failed',
          paymentStatus: appError.code === ErrorCodes.PAYMENT_FAILED ? 'failed' : 'pending',
          failureCode: appError.code,
          failureMessage: appError.message,
        });
        logger.info('Booking failed', { bookingId, code: appError.code });
        throw appError;
      }

      // 6. Only now is the booking confirmed.
      const confirmed = await repository.update(bookingId, bookingUpdateFromOrder(order));
      logger.info('Booking confirmed', { bookingId, providerOrderId: order.id });
      return { httpStatus: 201, booking: toBookingView(confirmed!, lookupToken) };
    },

    async lookup(token: string): Promise<BookingView> {
      const found = await repository.findByLookupTokenHash(hashToken(token));
      if (!found) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'No booking matches this code.');
      }

      // Refresh from the provider (at most once a minute) so cancellations/tickets show up.
      const { booking } = found;
      const stale = Date.now() - booking.updatedAt.getTime() > LOOKUP_REFRESH_INTERVAL_MS;
      if (booking.providerOrderId && stale) {
        try {
          const order = await provider.getOrder(booking.providerOrderId);
          const refreshed = await repository.update(booking.id, bookingUpdateFromOrder(order));
          if (refreshed) return toBookingView(refreshed);
        } catch (error) {
          logger.warn('Could not refresh order on lookup', {
            bookingId: booking.id,
            error: (error as Error).message,
          });
        }
      }
      return toBookingView(found);
    },

    /** Applies the latest provider state of an order to the matching booking (webhooks). */
    async syncOrder(orderId: string): Promise<string | null> {
      const order = await provider.getOrder(orderId);
      let found = await repository.findByProviderOrderId(order.id);
      const metaBookingId = order.metadata?.booking_id;
      if (!found && metaBookingId && /^[0-9a-f-]{36}$/i.test(metaBookingId)) {
        found = await repository.findById(metaBookingId);
      }
      if (!found) {
        logger.warn('Webhook for unknown order', { providerOrderId: order.id });
        return null;
      }
      await repository.update(found.booking.id, bookingUpdateFromOrder(order));
      return found.booking.id;
    },
  };
}

export type BookingsService = ReturnType<typeof createBookingsService>;
