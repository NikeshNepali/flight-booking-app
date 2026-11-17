import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/index.js';
import {
  bookingEvents,
  bookings,
  passengers,
  type BookingRow,
  type NewBookingRow,
  type NewPassengerRow,
  type PassengerRow,
} from '../../db/schema/index.js';

export interface BookingWithPassengers {
  booking: BookingRow;
  passengers: PassengerRow[];
}

export type BookingUpdate = Partial<
  Pick<
    BookingRow,
    | 'providerOrderId'
    | 'bookingReference'
    | 'status'
    | 'paymentStatus'
    | 'ticketingStatus'
    | 'totalAmount'
    | 'currency'
    | 'itinerarySnapshot'
    | 'failureCode'
    | 'failureMessage'
    | 'lookupTokenHash'
  >
>;

function isUniqueViolation(error: unknown): boolean {
  // drizzle wraps driver errors; the pg error is either the error itself or its cause.
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some((e) => (e as { code?: string } | undefined)?.code === '23505');
}

export function createBookingsRepository(db: Database) {
  async function withPassengers(
    booking: BookingRow | undefined,
  ): Promise<BookingWithPassengers | null> {
    if (!booking) return null;
    const rows = await db
      .select()
      .from(passengers)
      .where(eq(passengers.bookingId, booking.id))
      .orderBy(asc(passengers.createdAt), asc(passengers.id));
    return { booking, passengers: rows };
  }

  return {
    async findById(id: string) {
      const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      return withPassengers(row);
    },

    async findByIdempotencyKey(key: string) {
      const [row] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.idempotencyKey, key))
        .limit(1);
      return withPassengers(row);
    },

    async findByLookupTokenHash(hash: string) {
      const [row] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.lookupTokenHash, hash))
        .limit(1);
      return withPassengers(row);
    },

    async findByProviderOrderId(orderId: string) {
      const [row] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.providerOrderId, orderId))
        .limit(1);
      return withPassengers(row);
    },

    /**
     * Inserts the pending booking and its passengers atomically.
     * Returns null when a booking with the same idempotency key already exists.
     */
    async createPending(
      booking: NewBookingRow,
      passengerRows: Omit<NewPassengerRow, 'bookingId'>[],
    ): Promise<BookingWithPassengers | null> {
      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx.insert(bookings).values(booking).returning();
          const createdPassengers = await tx
            .insert(passengers)
            .values(passengerRows.map((p) => ({ ...p, bookingId: created!.id })))
            .returning();
          return { booking: created!, passengers: createdPassengers };
        });
      } catch (error) {
        if (isUniqueViolation(error)) return null;
        throw error;
      }
    },

    async update(id: string, changes: BookingUpdate) {
      const [row] = await db.update(bookings).set(changes).where(eq(bookings.id, id)).returning();
      return withPassengers(row);
    },

    async hasEvent(providerEventId: string): Promise<boolean> {
      const [row] = await db
        .select({ id: bookingEvents.id })
        .from(bookingEvents)
        .where(eq(bookingEvents.providerEventId, providerEventId))
        .limit(1);
      return Boolean(row);
    },

    /** Records a processed webhook event. Returns false if it was already recorded. */
    async recordEvent(
      providerEventId: string,
      eventType: string,
      bookingId: string | null,
    ): Promise<boolean> {
      const inserted = await db
        .insert(bookingEvents)
        .values({ providerEventId, eventType, bookingId })
        .onConflictDoNothing({ target: bookingEvents.providerEventId })
        .returning({ id: bookingEvents.id });
      return inserted.length > 0;
    },
  };
}

export type BookingsRepository = ReturnType<typeof createBookingsRepository>;
