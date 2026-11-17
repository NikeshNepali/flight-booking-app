import { z } from 'zod';
import { addDays, isValidIsoDate, todayUtc } from '../../utils/dates.js';

const iata = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Must be a 3-letter IATA code');

const isoDate = z.string().refine(isValidIsoDate, 'Must be a valid date (YYYY-MM-DD)');

export const MAX_PASSENGERS = 9;

export const searchSchema = z
  .object({
    origin: iata,
    destination: iata,
    departureDate: isoDate,
    returnDate: isoDate.optional(),
    adults: z.number().int().min(1, 'At least one adult is required').max(MAX_PASSENGERS),
    childAges: z.array(z.number().int().min(2).max(17)).max(8).default([]),
    infantAges: z.array(z.number().int().min(0).max(1)).max(4).default([]),
    cabinClass: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
    maxConnections: z.number().int().min(0).max(2).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.origin === value.destination) {
      ctx.addIssue({
        code: 'custom',
        path: ['destination'],
        message: 'Destination must differ from origin',
      });
    }
    // Allow "yesterday" in UTC so travellers ahead of UTC can still search for their today.
    if (value.departureDate < addDays(todayUtc(), -1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['departureDate'],
        message: 'Departure date cannot be in the past',
      });
    }
    if (value.departureDate > addDays(todayUtc(), 360)) {
      ctx.addIssue({
        code: 'custom',
        path: ['departureDate'],
        message: 'Airlines only sell about a year ahead',
      });
    }
    if (value.returnDate && value.returnDate < value.departureDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['returnDate'],
        message: 'Return date must be on or after departure',
      });
    }
    const total = value.adults + value.childAges.length + value.infantAges.length;
    if (total > MAX_PASSENGERS) {
      ctx.addIssue({
        code: 'custom',
        path: ['adults'],
        message: `A maximum of ${MAX_PASSENGERS} passengers is allowed`,
      });
    }
    if (value.infantAges.length > value.adults) {
      ctx.addIssue({
        code: 'custom',
        path: ['infantAges'],
        message: 'Each infant must travel with an adult',
      });
    }
  });

export const airportQuerySchema = z.object({
  query: z.string().trim().min(2, 'Type at least 2 characters').max(60),
});

export const offerIdParamsSchema = z.object({
  offerId: z.string().regex(/^off_[A-Za-z0-9]+$/, 'Invalid offer id'),
});

export const listOffersSchema = z.object({
  offerRequestId: z.string().regex(/^orq_[A-Za-z0-9]+$/, 'Invalid offer request id'),
  after: z.string().min(1).max(500),
});

export type SearchInput = z.output<typeof searchSchema>;
