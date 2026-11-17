/**
 * API types. These mirror backend/src/types/*.ts — keep them in sync when the API changes.
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
  departingAt: string;
  arrivingAt: string;
  durationMinutes: number | null;
  marketingCarrier: Carrier;
  operatingCarrier: Carrier;
  flightNumber: string;
  aircraft: string | null;
  cabinClass: CabinClass | null;
  cabinMarketingName: string | null;
  baggage: Baggage[];
  fareBasisCode: string | null;
}

export interface Condition {
  allowed: boolean;
  penaltyAmount: string | null;
  penaltyCurrency: string | null;
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
  connections: { airport: AirportRef; durationMinutes: number }[];
  fareBrandName: string | null;
  changeConditions: Condition | null;
}

export interface OfferPassenger {
  id: string;
  type: PassengerType | null;
  age: number | null;
}

export interface FareConditions {
  refundBeforeDeparture: Condition | null;
  changeBeforeDeparture: Condition | null;
}

export interface FlightOffer {
  id: string;
  provider: string;
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
  conditions: FareConditions;
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

export interface OffersPage {
  offerRequestId: string;
  offers: FlightOffer[];
  nextCursor: string | null;
}

export interface SearchParams {
  origin: string;
  originLabel?: string;
  destination: string;
  destinationLabel?: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  childAges: number[];
  infantAges: number[];
  cabinClass: CabinClass;
}

export interface PassengerForm {
  id: string;
  type: PassengerType | null;
  age: number | null;
  title: '' | 'mr' | 'ms' | 'mrs' | 'miss' | 'dr';
  gender: '' | 'm' | 'f';
  givenName: string;
  familyName: string;
  bornOn: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiresOn: string;
}

export interface ContactForm {
  email: string;
  phone: string;
}

export interface BookingView {
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'awaiting_payment' | 'failed' | 'refunded';
  ticketingStatus: 'not_issued' | 'issued';
  provider: string;
  providerOrderId: string | null;
  bookingReference: string | null;
  totalAmount: string;
  currency: string;
  liveMode: boolean;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
  itinerary: {
    owner: Carrier;
    slices: Slice[];
    baseAmount: string | null;
    taxAmount: string | null;
    conditions: FareConditions;
    tickets: { passengerIds: string[]; ticketNumber: string }[];
    cancelledAt: string | null;
    paymentRequiredBy: string | null;
  } | null;
  passengers: {
    providerPassengerId: string;
    title: string | null;
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    passengerType: PassengerType;
    ticketNumbers: string[];
  }[];
  failure: { code: string | null; message: string | null } | null;
  lookupToken?: string;
}

export interface HealthInfo {
  status: string;
  database: string;
  provider: { name: string; mode: 'test' | 'live'; configured: boolean; bookingsEnabled: boolean };
}
