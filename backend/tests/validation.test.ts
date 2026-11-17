import { describe, expect, it } from 'vitest';
import { createBookingSchema, lookupSchema } from '../src/modules/bookings/bookings.validation.js';
import { searchSchema } from '../src/modules/flights/flights.validation.js';
import { addDays, todayUtc } from '../src/utils/dates.js';

const validSearch = {
  origin: 'lhr',
  destination: 'JFK',
  departureDate: addDays(todayUtc(), 30),
  adults: 1,
};

describe('searchSchema', () => {
  it('accepts a valid one-way search and normalises codes', () => {
    const result = searchSchema.parse(validSearch);
    expect(result.origin).toBe('LHR');
    expect(result.cabinClass).toBe('economy');
    expect(result.childAges).toEqual([]);
  });

  it('rejects identical origin and destination', () => {
    expect(searchSchema.safeParse({ ...validSearch, destination: 'LHR' }).success).toBe(false);
  });

  it('rejects return before departure and past dates', () => {
    expect(
      searchSchema.safeParse({ ...validSearch, returnDate: addDays(todayUtc(), 10) }).success,
    ).toBe(false);
    expect(searchSchema.safeParse({ ...validSearch, departureDate: '2020-01-01' }).success).toBe(
      false,
    );
    expect(searchSchema.safeParse({ ...validSearch, departureDate: '2027-02-30' }).success).toBe(
      false,
    );
  });

  it('enforces passenger rules', () => {
    expect(searchSchema.safeParse({ ...validSearch, adults: 0 }).success).toBe(false);
    expect(searchSchema.safeParse({ ...validSearch, infantAges: [0, 1] }).success).toBe(false);
    expect(
      searchSchema.safeParse({ ...validSearch, adults: 5, childAges: [5, 6, 7, 8, 9] }).success,
    ).toBe(false);
    expect(searchSchema.safeParse({ ...validSearch, childAges: [1] }).success).toBe(false);
  });
});

describe('createBookingSchema', () => {
  const valid = {
    idempotencyKey: '3b241101-e2bb-4255-8caf-4136c566a962',
    offerId: 'off_123',
    expectedTotal: { amount: '450.20', currency: 'GBP' },
    acceptedConditions: true,
    contact: { email: 'traveller@example.com', phone: '+442080160509' },
    passengers: [
      {
        id: 'pas_1',
        title: 'ms',
        gender: 'f',
        givenName: 'Amelia',
        familyName: "O'Neil-Earhart",
        bornOn: '1987-07-24',
      },
    ],
  };

  it('accepts valid input', () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true);
  });
  it('requires accepting conditions', () => {
    expect(createBookingSchema.safeParse({ ...valid, acceptedConditions: false }).success).toBe(
      false,
    );
  });
  it('requires E.164 phone numbers and valid emails', () => {
    expect(
      createBookingSchema.safeParse({
        ...valid,
        contact: { ...valid.contact, phone: '020 8016 0509' },
      }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({ ...valid, contact: { ...valid.contact, email: 'nope' } })
        .success,
    ).toBe(false);
  });
  it('rejects names with digits', () => {
    const passengers = [{ ...valid.passengers[0], givenName: 'Am3lia' }];
    expect(createBookingSchema.safeParse({ ...valid, passengers }).success).toBe(false);
  });
});

describe('lookupSchema', () => {
  it('only accepts 43-character base64url tokens', () => {
    expect(lookupSchema.safeParse({ token: 'a'.repeat(43) }).success).toBe(true);
    expect(lookupSchema.safeParse({ token: 'abc' }).success).toBe(false);
    expect(lookupSchema.safeParse({ token: `${'a'.repeat(42)}!` }).success).toBe(false);
  });
});
