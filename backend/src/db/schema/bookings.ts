import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  date,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ItinerarySnapshot } from '../../types/booking.js';

/**
 * pending   – row created, provider order not (yet) confirmed. Also used when the provider
 *             call timed out and the outcome is unknown (reconciled later by webhook/lookup).
 * confirmed – the provider created the airline order (has provider_order_id + booking reference).
 * failed    – the provider definitively rejected the order. No airline booking exists.
 * cancelled – the airline order was cancelled after confirmation.
 */
export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'failed',
  'cancelled',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'awaiting_payment',
  'failed',
  'refunded',
]);

/** Confirmed ≠ ticketed: an airline may confirm a reservation before issuing e-tickets. */
export const ticketingStatusEnum = pgEnum('ticketing_status', ['not_issued', 'issued']);

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Client-generated key; guarantees one provider order per checkout attempt. */
    idempotencyKey: uuid('idempotency_key').notNull().unique(),
    provider: text('provider').notNull().default('duffel'),
    providerOfferId: text('provider_offer_id').notNull(),
    providerOrderId: text('provider_order_id').unique(),
    bookingReference: text('booking_reference'),
    lookupTokenHash: char('lookup_token_hash', { length: 64 }).notNull().unique(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    status: bookingStatusEnum('status').notNull().default('pending'),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('pending'),
    ticketingStatus: ticketingStatusEnum('ticketing_status').notNull().default('not_issued'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    liveMode: boolean('live_mode').notNull(),
    itinerarySnapshot: jsonb('itinerary_snapshot').$type<ItinerarySnapshot>(),
    failureCode: text('failure_code'),
    failureMessage: text('failure_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('bookings_status_idx').on(table.status),
    index('bookings_created_at_idx').on(table.createdAt),
    check('bookings_total_amount_non_negative', sql`${table.totalAmount} >= 0`),
    check('bookings_currency_format', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'bookings_confirmed_has_order',
      sql`${table.status} NOT IN ('confirmed', 'cancelled') OR ${table.providerOrderId} IS NOT NULL`,
    ),
  ],
);

export const passengerTypeEnum = pgEnum('passenger_type', [
  'adult',
  'child',
  'infant_without_seat',
]);

export const passengers = pgTable(
  'passengers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    providerPassengerId: text('provider_passenger_id').notNull(),
    title: text('title'),
    givenName: text('given_name').notNull(),
    familyName: text('family_name').notNull(),
    dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
    passengerType: passengerTypeEnum('passenger_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('passengers_booking_id_idx').on(table.bookingId)],
);

export const bookingEvents = pgTable(
  'booking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Nullable: a webhook may arrive for an order we cannot (yet) match. */
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    providerEventId: text('provider_event_id').notNull().unique(),
    eventType: text('event_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('booking_events_booking_id_idx').on(table.bookingId)],
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
export type PassengerRow = typeof passengers.$inferSelect;
export type NewPassengerRow = typeof passengers.$inferInsert;
