import type { ProviderOrder } from '../../types/booking.js';
import type {
  AirportRef,
  CabinClass,
  Carrier,
  Condition,
  FlightOffer,
  PassengerType,
  Place,
  Segment,
  Slice,
} from '../../types/flights.js';
import { isoDurationToMinutes, minutesBetweenLocal } from '../../utils/duration.js';
import type {
  DuffelCarrier,
  DuffelCondition,
  DuffelConditions,
  DuffelOffer,
  DuffelOrder,
  DuffelPlace,
  DuffelPlaceAirport,
  DuffelSegment,
  DuffelSlice,
} from './duffel.types.js';

const CABIN_CLASSES: CabinClass[] = ['economy', 'premium_economy', 'business', 'first'];
const PASSENGER_TYPES: PassengerType[] = ['adult', 'child', 'infant_without_seat'];

function toCabin(value: string | null | undefined): CabinClass | null {
  return CABIN_CLASSES.includes(value as CabinClass) ? (value as CabinClass) : null;
}

function toPassengerType(value: string | null | undefined): PassengerType | null {
  return PASSENGER_TYPES.includes(value as PassengerType) ? (value as PassengerType) : null;
}

export function mapCarrier(carrier: DuffelCarrier | null | undefined): Carrier {
  return {
    name: carrier?.name ?? 'Unknown airline',
    iataCode: carrier?.iata_code ?? null,
    logoUrl: carrier?.logo_symbol_url ?? null,
  };
}

function mapAirport(airport: DuffelPlaceAirport): AirportRef {
  return {
    iataCode: airport.iata_code,
    name: airport.name,
    cityName: airport.city_name ?? null,
    timeZone: airport.time_zone ?? null,
  };
}

export function mapCondition(condition: DuffelCondition | null | undefined): Condition | null {
  if (!condition) return null;
  return {
    allowed: condition.allowed,
    penaltyAmount: condition.penalty_amount ?? null,
    penaltyCurrency: condition.penalty_currency ?? null,
  };
}

function mapConditions(conditions: DuffelConditions | null | undefined) {
  return {
    refundBeforeDeparture: mapCondition(conditions?.refund_before_departure),
    changeBeforeDeparture: mapCondition(conditions?.change_before_departure),
  };
}

export function mapPlace(place: DuffelPlace): Place | null {
  if (!place.iata_code) return null;
  return {
    type: place.type,
    iataCode: place.iata_code,
    name: place.name,
    cityName: place.city_name ?? (place.type === 'city' ? place.name : null),
    countryCode: place.iata_country_code ?? null,
    timeZone: place.time_zone ?? null,
    airports:
      place.type === 'city'
        ? (place.airports ?? []).map((airport) => ({
            type: 'airport' as const,
            iataCode: airport.iata_code,
            name: airport.name,
            cityName: airport.city_name ?? place.name,
            countryCode: airport.iata_country_code ?? place.iata_country_code ?? null,
            timeZone: airport.time_zone ?? null,
          }))
        : undefined,
  };
}

function mapSegment(segment: DuffelSegment): Segment {
  // Baggage and cabin are given per passenger; the first passenger is representative
  // for display. Infants usually have no baggage, so prefer a passenger that has some.
  const segmentPassengers = segment.passengers ?? [];
  const representative =
    segmentPassengers.find((p) => (p.baggages ?? []).length > 0) ?? segmentPassengers[0];
  return {
    id: segment.id,
    origin: mapAirport(segment.origin),
    destination: mapAirport(segment.destination),
    departingAt: segment.departing_at,
    arrivingAt: segment.arriving_at,
    durationMinutes: isoDurationToMinutes(segment.duration),
    marketingCarrier: mapCarrier(segment.marketing_carrier),
    operatingCarrier: mapCarrier(segment.operating_carrier),
    flightNumber: `${segment.marketing_carrier?.iata_code ?? ''}${segment.marketing_carrier_flight_number}`,
    aircraft: segment.aircraft?.name ?? null,
    cabinClass: toCabin(representative?.cabin_class),
    cabinMarketingName: representative?.cabin_class_marketing_name ?? null,
    baggage: (representative?.baggages ?? []).map((b) => ({ type: b.type, quantity: b.quantity })),
    fareBasisCode: representative?.fare_basis_code ?? null,
  };
}

export function mapSlice(slice: DuffelSlice): Slice {
  const segments = slice.segments.map(mapSegment);
  const first = segments[0];
  const last = segments[segments.length - 1];
  const connections = segments.slice(1).map((segment, index) => {
    const previous = segments[index]!;
    return {
      airport: previous.destination,
      durationMinutes: minutesBetweenLocal(previous.arrivingAt, segment.departingAt),
    };
  });
  return {
    id: slice.id,
    origin: mapAirport(slice.origin),
    destination: mapAirport(slice.destination),
    departingAt: first?.departingAt ?? '',
    arrivingAt: last?.arrivingAt ?? '',
    durationMinutes: isoDurationToMinutes(slice.duration),
    stops: Math.max(segments.length - 1, 0),
    segments,
    connections,
    fareBrandName: slice.fare_brand_name ?? null,
    changeConditions: mapCondition(slice.conditions?.change_before_departure),
  };
}

export function mapOffer(offer: DuffelOffer): FlightOffer {
  return {
    id: offer.id,
    provider: 'duffel',
    totalAmount: offer.total_amount,
    totalCurrency: offer.total_currency,
    baseAmount: offer.base_amount ?? null,
    baseCurrency: offer.base_currency ?? null,
    taxAmount: offer.tax_amount ?? null,
    taxCurrency: offer.tax_currency ?? null,
    expiresAt: offer.expires_at,
    owner: mapCarrier(offer.owner),
    slices: offer.slices.map(mapSlice),
    passengers: offer.passengers.map((p) => ({
      id: p.id,
      type: toPassengerType(p.type),
      age: p.age ?? null,
    })),
    conditions: mapConditions(offer.conditions),
    identityDocumentsRequired: offer.passenger_identity_documents_required ?? false,
    supportedIdentityDocumentTypes: offer.supported_passenger_identity_document_types ?? [],
    paymentRequirements: {
      requiresInstantPayment: offer.payment_requirements?.requires_instant_payment ?? true,
      priceGuaranteeExpiresAt: offer.payment_requirements?.price_guarantee_expires_at ?? null,
      paymentRequiredBy: offer.payment_requirements?.payment_required_by ?? null,
    },
    totalEmissionsKg: offer.total_emissions_kg ?? null,
    liveMode: offer.live_mode,
  };
}

export function mapOrder(order: DuffelOrder): ProviderOrder {
  return {
    id: order.id,
    bookingReference: order.booking_reference ?? null,
    totalAmount: order.total_amount,
    totalCurrency: order.total_currency,
    baseAmount: order.base_amount ?? null,
    taxAmount: order.tax_amount ?? null,
    liveMode: order.live_mode,
    createdAt: order.created_at ?? null,
    cancelledAt: order.cancelled_at ?? null,
    owner: mapCarrier(order.owner),
    slices: order.slices.map(mapSlice),
    passengers: order.passengers.map((p) => ({
      id: p.id,
      type: toPassengerType(p.type),
      title: p.title ?? null,
      givenName: p.given_name,
      familyName: p.family_name,
      bornOn: p.born_on ?? null,
    })),
    tickets: (order.documents ?? [])
      .filter((doc) => doc.type === 'electronic_ticket')
      .map((doc) => ({
        passengerIds: doc.passenger_ids ?? [],
        ticketNumber: doc.unique_identifier,
      })),
    awaitingPayment: order.payment_status?.awaiting_payment ?? false,
    paymentRequiredBy: order.payment_status?.payment_required_by ?? null,
    conditions: mapConditions(order.conditions),
    metadata: order.metadata ?? null,
  };
}

/**
 * Removes offers that are indistinguishable to a traveller: same airline, same flights at
 * the same times, same cabin, same price, same baggage, same fare brand and same conditions.
 * Offers that differ in any of these (e.g. a flexible fare vs a basic fare) are kept.
 */
export function dedupeOffers(offers: FlightOffer[]): FlightOffer[] {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    const key = JSON.stringify([
      offer.owner.iataCode,
      offer.totalAmount,
      offer.totalCurrency,
      offer.conditions,
      offer.slices.map((slice) => [
        slice.fareBrandName,
        slice.changeConditions,
        slice.segments.map((s) => [
          s.flightNumber,
          s.departingAt,
          s.arrivingAt,
          s.cabinClass,
          s.cabinMarketingName,
          s.baggage,
        ]),
      ]),
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
