/**
 * Subset of Duffel API v2 response shapes used by this app.
 * Reference: https://duffel.com/docs/api/v2 (Offers, Offer Requests, Orders, Places).
 * Fields are typed as optional/nullable where Duffel documents them as such.
 */

export interface DuffelCarrier {
  name: string;
  iata_code: string | null;
  logo_symbol_url?: string | null;
  logo_lockup_url?: string | null;
}

export interface DuffelPlaceAirport {
  type?: 'airport';
  iata_code: string;
  name: string;
  city_name?: string | null;
  iata_country_code?: string | null;
  time_zone?: string | null;
}

export interface DuffelPlace {
  type: 'airport' | 'city';
  id: string;
  iata_code: string | null;
  name: string;
  city_name?: string | null;
  iata_country_code?: string | null;
  time_zone?: string | null;
  airports?: DuffelPlaceAirport[] | null;
}

export interface DuffelBaggage {
  type: 'checked' | 'carry_on';
  quantity: number;
}

export interface DuffelSegmentPassenger {
  passenger_id: string;
  cabin_class?: string | null;
  cabin_class_marketing_name?: string | null;
  fare_basis_code?: string | null;
  baggages?: DuffelBaggage[];
}

export interface DuffelSegment {
  id: string;
  origin: DuffelPlaceAirport;
  destination: DuffelPlaceAirport;
  departing_at: string;
  arriving_at: string;
  duration?: string | null;
  marketing_carrier: DuffelCarrier;
  operating_carrier: DuffelCarrier;
  marketing_carrier_flight_number: string;
  operating_carrier_flight_number?: string | null;
  aircraft?: { name: string } | null;
  passengers?: DuffelSegmentPassenger[];
}

export interface DuffelCondition {
  allowed: boolean;
  penalty_amount?: string | null;
  penalty_currency?: string | null;
}

export interface DuffelSlice {
  id: string;
  origin: DuffelPlaceAirport;
  destination: DuffelPlaceAirport;
  duration?: string | null;
  fare_brand_name?: string | null;
  segments: DuffelSegment[];
  conditions?: { change_before_departure?: DuffelCondition | null } | null;
}

export interface DuffelConditions {
  refund_before_departure?: DuffelCondition | null;
  change_before_departure?: DuffelCondition | null;
}

export interface DuffelOffer {
  id: string;
  live_mode: boolean;
  expires_at: string;
  total_amount: string;
  total_currency: string;
  base_amount?: string | null;
  base_currency?: string | null;
  tax_amount?: string | null;
  tax_currency?: string | null;
  total_emissions_kg?: string | null;
  owner: DuffelCarrier;
  slices: DuffelSlice[];
  passengers: { id: string; type?: string | null; age?: number | null }[];
  conditions?: DuffelConditions | null;
  passenger_identity_documents_required?: boolean;
  supported_passenger_identity_document_types?: string[];
  payment_requirements?: {
    requires_instant_payment?: boolean;
    price_guarantee_expires_at?: string | null;
    payment_required_by?: string | null;
  } | null;
}

export interface DuffelOfferRequest {
  id: string;
  live_mode: boolean;
  offers?: DuffelOffer[];
}

export interface DuffelOrder {
  id: string;
  live_mode: boolean;
  booking_reference: string | null;
  total_amount: string;
  total_currency: string;
  base_amount?: string | null;
  tax_amount?: string | null;
  created_at?: string | null;
  cancelled_at?: string | null;
  owner: DuffelCarrier;
  slices: DuffelSlice[];
  passengers: {
    id: string;
    type?: string | null;
    title?: string | null;
    given_name: string;
    family_name: string;
    born_on?: string | null;
  }[];
  documents?: { type: string; unique_identifier: string; passenger_ids?: string[] }[];
  payment_status?: {
    awaiting_payment?: boolean;
    payment_required_by?: string | null;
  } | null;
  conditions?: DuffelConditions | null;
  metadata?: Record<string, string> | null;
}

export interface DuffelErrorItem {
  code?: string;
  title?: string;
  message?: string;
  type?: string;
}

export interface DuffelListResponse<T> {
  data: T[];
  meta?: { after?: string | null; before?: string | null; limit?: number };
}
