import { describe, expect, it } from 'vitest';
import { dedupeOffers, mapOffer, mapOrder } from '../src/integrations/duffel/duffel.mappers.js';
import { isoDurationToMinutes } from '../src/utils/duration.js';
import { makeDuffelOffer, makeDuffelOrder } from './fixtures/duffelOffer.js';

describe('isoDurationToMinutes', () => {
  it('parses hours/minutes and days', () => {
    expect(isoDurationToMinutes('PT2H26M')).toBe(146);
    expect(isoDurationToMinutes('P1DT2H')).toBe(1560);
    expect(isoDurationToMinutes('PT45M')).toBe(45);
  });
  it('returns null for missing or invalid values', () => {
    expect(isoDurationToMinutes(null)).toBeNull();
    expect(isoDurationToMinutes('2 hours')).toBeNull();
  });
});

describe('mapOffer', () => {
  const offer = mapOffer(makeDuffelOffer());

  it('maps price, owner and passengers', () => {
    expect(offer.totalAmount).toBe('450.20');
    expect(offer.totalCurrency).toBe('GBP');
    expect(offer.owner).toMatchObject({ name: 'Duffel Airways', iataCode: 'ZZ' });
    expect(offer.passengers).toEqual([
      { id: 'pas_adult1', type: 'adult', age: null },
      { id: 'pas_child1', type: 'child', age: 8 },
    ]);
  });

  it('computes stops, connection airports and layover duration', () => {
    const slice = offer.slices[0]!;
    expect(slice.stops).toBe(1);
    expect(slice.durationMinutes).toBe(645);
    expect(slice.connections).toEqual([
      { airport: expect.objectContaining({ iataCode: 'DUB' }), durationMinutes: 105 },
    ]);
  });

  it('maps segment details including operating carrier and baggage', () => {
    const [first, second] = offer.slices[0]!.segments;
    expect(first!.flightNumber).toBe('ZZ101');
    expect(first!.baggage).toEqual([
      { type: 'checked', quantity: 1 },
      { type: 'carry_on', quantity: 1 },
    ]);
    expect(second!.operatingCarrier.name).toBe('Partner Air');
  });

  it('keeps unknown conditions as null instead of guessing', () => {
    const mapped = mapOffer(makeDuffelOffer({ conditions: {} }));
    expect(mapped.conditions.refundBeforeDeparture).toBeNull();
  });
});

describe('dedupeOffers', () => {
  it('removes identical offers but keeps meaningful fare differences', () => {
    const base = mapOffer(makeDuffelOffer());
    const duplicate = mapOffer(makeDuffelOffer({ id: 'off_dup' }));
    const pricier = mapOffer(makeDuffelOffer({ id: 'off_flex', total_amount: '520.00' }));
    const result = dedupeOffers([base, duplicate, pricier]);
    expect(result.map((o) => o.id)).toEqual(['off_0000TestOffer1', 'off_flex']);
  });
});

describe('mapOrder', () => {
  it('extracts e-ticket numbers only from electronic_ticket documents', () => {
    const order = mapOrder(
      makeDuffelOrder({
        documents: [
          {
            type: 'electronic_ticket',
            unique_identifier: '1252212250',
            passenger_ids: ['pas_adult1'],
          },
          { type: 'other', unique_identifier: 'X' },
        ],
      }),
    );
    expect(order.tickets).toEqual([{ passengerIds: ['pas_adult1'], ticketNumber: '1252212250' }]);
    expect(order.bookingReference).toBe('RZPNX8');
  });
});
