import type { DuffelOffer, DuffelOrder } from '../../src/integrations/duffel/duffel.types.js';

/**
 * MOCK data shaped like a Duffel API v2 offer, used only by unit tests.
 * The running application never uses this file.
 */
export function makeDuffelOffer(overrides: Partial<DuffelOffer> = {}): DuffelOffer {
  const carrier = {
    name: 'Duffel Airways',
    iata_code: 'ZZ',
    logo_symbol_url:
      'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/ZZ.svg',
  };
  return {
    id: 'off_0000TestOffer1',
    live_mode: false,
    expires_at: '2099-01-01T00:00:00Z',
    total_amount: '450.20',
    total_currency: 'GBP',
    base_amount: '380.00',
    base_currency: 'GBP',
    tax_amount: '70.20',
    tax_currency: 'GBP',
    total_emissions_kg: '460',
    owner: carrier,
    passengers: [
      { id: 'pas_adult1', type: 'adult', age: null },
      { id: 'pas_child1', type: 'child', age: 8 },
    ],
    conditions: {
      refund_before_departure: { allowed: false, penalty_amount: null, penalty_currency: null },
      change_before_departure: { allowed: true, penalty_amount: '50.00', penalty_currency: 'GBP' },
    },
    passenger_identity_documents_required: false,
    supported_passenger_identity_document_types: ['passport'],
    payment_requirements: {
      requires_instant_payment: true,
      price_guarantee_expires_at: null,
      payment_required_by: null,
    },
    slices: [
      {
        id: 'sli_out',
        origin: {
          iata_code: 'LHR',
          name: 'Heathrow',
          city_name: 'London',
          time_zone: 'Europe/London',
        },
        destination: {
          iata_code: 'JFK',
          name: 'John F. Kennedy International',
          city_name: 'New York',
          time_zone: 'America/New_York',
        },
        duration: 'PT10H45M',
        fare_brand_name: 'Basic',
        conditions: {
          change_before_departure: {
            allowed: true,
            penalty_amount: '50.00',
            penalty_currency: 'GBP',
          },
        },
        segments: [
          {
            id: 'seg_1',
            origin: {
              iata_code: 'LHR',
              name: 'Heathrow',
              city_name: 'London',
              time_zone: 'Europe/London',
            },
            destination: {
              iata_code: 'DUB',
              name: 'Dublin',
              city_name: 'Dublin',
              time_zone: 'Europe/Dublin',
            },
            departing_at: '2027-03-15T08:00:00',
            arriving_at: '2027-03-15T09:20:00',
            duration: 'PT1H20M',
            marketing_carrier: carrier,
            operating_carrier: carrier,
            marketing_carrier_flight_number: '101',
            aircraft: { name: 'Airbus A320' },
            passengers: [
              {
                passenger_id: 'pas_adult1',
                cabin_class: 'economy',
                cabin_class_marketing_name: 'Economy',
                fare_basis_code: 'Y20LGTN2',
                baggages: [
                  { type: 'checked', quantity: 1 },
                  { type: 'carry_on', quantity: 1 },
                ],
              },
            ],
          },
          {
            id: 'seg_2',
            origin: {
              iata_code: 'DUB',
              name: 'Dublin',
              city_name: 'Dublin',
              time_zone: 'Europe/Dublin',
            },
            destination: {
              iata_code: 'JFK',
              name: 'John F. Kennedy International',
              city_name: 'New York',
              time_zone: 'America/New_York',
            },
            departing_at: '2027-03-15T11:05:00',
            arriving_at: '2027-03-15T13:45:00',
            duration: 'PT7H40M',
            marketing_carrier: carrier,
            operating_carrier: { name: 'Partner Air', iata_code: 'PA' },
            marketing_carrier_flight_number: '202',
            passengers: [
              {
                passenger_id: 'pas_adult1',
                cabin_class: 'economy',
                baggages: [{ type: 'checked', quantity: 1 }],
              },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function makeDuffelOrder(overrides: Partial<DuffelOrder> = {}): DuffelOrder {
  const offer = makeDuffelOffer();
  return {
    id: 'ord_0000TestOrder1',
    live_mode: false,
    booking_reference: 'RZPNX8',
    total_amount: offer.total_amount,
    total_currency: offer.total_currency,
    base_amount: offer.base_amount,
    tax_amount: offer.tax_amount,
    created_at: '2026-11-16T10:00:00Z',
    cancelled_at: null,
    owner: offer.owner,
    slices: offer.slices,
    passengers: [
      {
        id: 'pas_adult1',
        type: 'adult',
        title: 'ms',
        given_name: 'Amelia',
        family_name: 'Earhart',
        born_on: '1987-07-24',
      },
      {
        id: 'pas_child1',
        type: 'child',
        title: 'miss',
        given_name: 'Ada',
        family_name: 'Earhart',
        born_on: '2018-06-01',
      },
    ],
    documents: [],
    payment_status: { awaiting_payment: false, payment_required_by: null },
    conditions: offer.conditions,
    metadata: null,
    ...overrides,
  };
}
