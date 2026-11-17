import { describe, expect, it } from 'vitest';
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
