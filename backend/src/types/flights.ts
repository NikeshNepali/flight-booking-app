/**
 * Provider-agnostic flight types. The Duffel integration maps its responses into
 * these shapes, so the rest of the app (and the frontend) never depends on Duffel's format.
 */

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type PassengerType = 'adult' | 'child' | 'infant_without_seat';

export interface Place {
  type: 'airport' | 'city';
  iataCode: string;
  name: string;
  cityName: string | null;
  countryCode: string | null;
  timeZone: string | null;
  /** Airports belonging to a city result. */
  airports?: Place[];
}

export interface AirportRef {
  iataCode: string;
  name: string;
  cityName: string | null;
  timeZone: string | null;
}

export interface Carrier {
  name: string;
  iataCode: string | null;
  logoUrl: string | null;
}

export interface Baggage {
  type: 'checked' | 'carry_on';
  quantity: number;
}

export interface Segment {
  id: string;
  origin: AirportRef;
  destination: AirportRef;
  /** Local time at the origin airport, ISO 8601 without offset. */
  departingAt: string;
  /** Local time at the destination airport, ISO 8601 without offset. */
  arrivingAt: string;
  durationMinutes: number | null;
  marketingCarrier: Carrier;
  operatingCarrier: Carrier;
  flightNumber: string;
  aircraft: string | null;
  cabinClass: CabinClass | null;
  cabinMarketingName: string | null;
  /** Baggage for the first passenger on this segment (identical for most fares). */
  baggage: Baggage[];
  fareBasisCode: string | null;
}

export interface Connection {
  airport: AirportRef;
  durationMinutes: number;
}

export interface Slice {
  id: string;
  origin: AirportRef;
  destination: AirportRef;
  departingAt: string;
  arrivingAt: string;
  durationMinutes: number | null;
  stops: number;
  segments: Segment[];
  connections: Connection[];
  fareBrandName: string | null;
  changeConditions: Condition | null;
}

/** null means "the provider did not say" — never assume allowed or not allowed. */
export interface Condition {
  allowed: boolean;
  penaltyAmount: string | null;
  penaltyCurrency: string | null;
}

export interface OfferPassenger {
  id: string;
  type: PassengerType | null;
  age: number | null;
}

export interface FlightOffer {
  id: string;
  provider: 'duffel';
  totalAmount: string;
  totalCurrency: string;
  baseAmount: string | null;
  baseCurrency: string | null;
  taxAmount: string | null;
  taxCurrency: string | null;
  expiresAt: string;
  owner: Carrier;
  slices: Slice[];
  passengers: OfferPassenger[];
  conditions: {
    refundBeforeDeparture: Condition | null;
    changeBeforeDeparture: Condition | null;
  };
  identityDocumentsRequired: boolean;
  supportedIdentityDocumentTypes: string[];
  paymentRequirements: {
    requiresInstantPayment: boolean;
    priceGuaranteeExpiresAt: string | null;
    paymentRequiredBy: string | null;
  };
  totalEmissionsKg: string | null;
  liveMode: boolean;
}

export interface SearchCriteria {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  childAges: number[];
  /** Infants under 2 travelling on a lap (ages 0 or 1). */
  infantAges: number[];
  cabinClass: CabinClass;
  maxConnections?: number;
}

export interface OffersPage {
  offerRequestId: string;
  offers: FlightOffer[];
  nextCursor: string | null;
}
