import type { Condition, FlightOffer, PassengerType, Slice } from './flights.js';

export interface IdentityDocumentInput {
  type: 'passport';
  uniqueIdentifier: string;
  issuingCountryCode: string;
  expiresOn: string;
}

export interface PassengerInput {
  /** Passenger id from the offer (the provider assigns these at search time). */
  id: string;
  title: 'mr' | 'ms' | 'mrs' | 'miss' | 'dr';
  gender: 'm' | 'f';
  givenName: string;
  familyName: string;
  bornOn: string;
  identityDocument?: IdentityDocumentInput;
}

export interface CreateOrderInput {
  offer: FlightOffer;
  passengers: PassengerInput[];
  contact: { email: string; phone: string };
  /** Our booking id, stored on the provider order as metadata for reconciliation. */
  bookingId: string;
}

export interface ProviderOrderPassenger {
  id: string;
  type: PassengerType | null;
  title: string | null;
  givenName: string;
  familyName: string;
  bornOn: string | null;
}

export interface ProviderOrder {
  id: string;
  bookingReference: string | null;
  totalAmount: string;
  totalCurrency: string;
  baseAmount: string | null;
  taxAmount: string | null;
  liveMode: boolean;
  createdAt: string | null;
  cancelledAt: string | null;
  owner: FlightOffer['owner'];
  slices: Slice[];
  passengers: ProviderOrderPassenger[];
  /** E-ticket numbers per passenger id; empty until the airline issues tickets. */
  tickets: { passengerIds: string[]; ticketNumber: string }[];
  awaitingPayment: boolean;
  paymentRequiredBy: string | null;
  conditions: {
    refundBeforeDeparture: Condition | null;
    changeBeforeDeparture: Condition | null;
  };
  metadata: Record<string, string> | null;
}

/** What we persist as the booking's itinerary snapshot (JSONB). */
export interface ItinerarySnapshot {
  owner: FlightOffer['owner'];
  slices: Slice[];
  baseAmount: string | null;
  taxAmount: string | null;
  conditions: ProviderOrder['conditions'];
  tickets: ProviderOrder['tickets'];
  cancelledAt: string | null;
  paymentRequiredBy: string | null;
}

/** Booking as returned to the client. */
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
  itinerary: ItinerarySnapshot | null;
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
  /** Only present in the response that created the booking. */
  lookupToken?: string;
}
