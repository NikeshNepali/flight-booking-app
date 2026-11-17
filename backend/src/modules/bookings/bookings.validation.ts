import { z } from 'zod';
import { isValidIsoDate } from '../../utils/dates.js';

const isoDate = z.string().refine(isValidIsoDate, 'Must be a valid date (YYYY-MM-DD)');

// Letters (any script) plus spaces, hyphens, apostrophes and dots. Airlines may further
// restrict names to Latin characters; the provider will reject those with a clear message.
const name = z
  .string()
  .trim()
  .min(1, 'Required')
  .max(50, 'Too long')
  .regex(/^\p{L}[\p{L}\p{M}\s'.-]*$/u, 'Use letters, spaces, hyphens or apostrophes only');

export const identityDocumentSchema = z.object({
  type: z.literal('passport'),
  uniqueIdentifier: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{5,20}$/, 'Passport number must be 5–20 letters or digits'),
  issuingCountryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a 2-letter country code'),
  expiresOn: isoDate,
});

export const passengerSchema = z.object({
  id: z.string().regex(/^pas_[A-Za-z0-9]+$/, 'Invalid passenger id'),
  title: z.enum(['mr', 'ms', 'mrs', 'miss', 'dr']),
  gender: z.enum(['m', 'f']),
  givenName: name,
  familyName: name,
  bornOn: isoDate,
  identityDocument: identityDocumentSchema.optional(),
});

export const createBookingSchema = z.object({
  idempotencyKey: z.uuid('Invalid idempotency key'),
  offerId: z.string().regex(/^off_[A-Za-z0-9]+$/, 'Invalid offer id'),
  expectedTotal: z.object({
    amount: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid amount'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Invalid currency'),
  }),
  acceptedConditions: z.literal(true, { error: 'You must accept the fare conditions' }),
  contact: z.object({
    email: z.email('Enter a valid email address').max(254),
    phone: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{6,14}$/, 'Use international format, e.g. +442080160509'),
  }),
  passengers: z.array(passengerSchema).min(1).max(9),
});

export const lookupSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{43}$/, 'This does not look like a valid booking code'),
});

export type CreateBookingInput = z.output<typeof createBookingSchema>;
