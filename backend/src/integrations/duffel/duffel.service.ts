import type { CreateOrderInput, ProviderOrder } from '../../types/booking.js';
import type { FlightOffer, OffersPage, Place, SearchCriteria } from '../../types/flights.js';
import type { FlightProvider } from '../../types/provider.js';
import { AppError, ErrorCodes } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';
import { DuffelApiError, DuffelClient, DuffelNetworkError } from './duffel.client.js';
import { dedupeOffers, mapOffer, mapOrder, mapPlace } from './duffel.mappers.js';
import type {
  DuffelListResponse,
  DuffelOffer,
  DuffelOfferRequest,
  DuffelOrder,
  DuffelPlace,
} from './duffel.types.js';

const OFFER_GONE_CODES = new Set(['offer_no_longer_available', 'offer_expired', 'not_found']);

/**
 * Translates Duffel failures into AppErrors that are safe to show to users.
 * `uncertain` is true when we cannot know whether Duffel processed the request
 * (timeouts, network failures, 5xx) — important for order creation.
 */
export function toAppError(error: unknown, context: string): AppError & { uncertain?: boolean } {
  if (error instanceof AppError) return error;

  if (error instanceof DuffelNetworkError) {
    const appError = new AppError(
      504,
      error.timedOut ? ErrorCodes.PROVIDER_TIMEOUT : ErrorCodes.PROVIDER_UNAVAILABLE,
      error.timedOut
        ? 'The flight provider took too long to respond. Please try again.'
        : 'Could not reach the flight provider. Please check your connection and try again.',
    );
    return Object.assign(appError, { uncertain: true });
  }

  if (error instanceof DuffelApiError) {
    logger.warn('Duffel API error', {
      context,
      status: error.status,
      code: error.code,
      type: error.type,
      requestId: error.requestId,
    });
    const message = error.errors[0]?.message;

    if (error.status === 401 || error.status === 403) {
      return new AppError(
        503,
        ErrorCodes.CONFIG_ERROR,
        'The flight provider rejected our credentials. Check DUFFEL_ACCESS_TOKEN.',
      );
    }
    if (error.status === 429) {
      return new AppError(
        429,
        ErrorCodes.RATE_LIMITED,
        'The flight provider is busy. Please try again shortly.',
      );
    }
    if (error.code && OFFER_GONE_CODES.has(error.code)) {
      return new AppError(
        410,
        ErrorCodes.OFFER_EXPIRED,
        'This offer is no longer available. Please search again.',
      );
    }
    if (error.code === 'price_changed') {
      return new AppError(
        409,
        ErrorCodes.PRICE_CHANGED,
        message ?? 'The price of this offer has changed.',
      );
    }
    if (error.code === 'insufficient_balance' || error.type === 'payment_error') {
      return new AppError(
        402,
        ErrorCodes.PAYMENT_FAILED,
        message ?? 'Payment could not be completed.',
      );
    }
    if (error.status >= 500) {
      return Object.assign(
        new AppError(
          502,
          ErrorCodes.PROVIDER_UNAVAILABLE,
          'The flight provider is temporarily unavailable.',
        ),
        { uncertain: true },
      );
    }
    if (error.type === 'validation_error' || error.status === 422 || error.status === 400) {
      return new AppError(
        422,
        ErrorCodes.VALIDATION_ERROR,
        message ?? 'The provider rejected some of the details.',
        {
          providerCode: error.code,
        },
      );
    }
    if (error.status === 404) {
      return new AppError(
        404,
        ErrorCodes.NOT_FOUND,
        'The requested item was not found at the provider.',
      );
    }
    return new AppError(
      502,
      ErrorCodes.PROVIDER_ERROR,
      message ?? 'The flight provider returned an error.',
      {
        providerCode: error.code,
      },
    );
  }

  logger.error('Unexpected provider error', { context, error: (error as Error)?.message });
  return new AppError(502, ErrorCodes.PROVIDER_ERROR, 'Unexpected error from the flight provider.');
}

export class DuffelFlightProvider implements FlightProvider {
  readonly name = 'duffel';

  constructor(
    private readonly client: DuffelClient,
    private readonly expectedLiveMode: boolean,
  ) {}

  private async call<T>(context: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw toAppError(error, context);
    }
  }

  /** GET /places/suggestions — airports and cities matching free text. */
  async searchPlaces(query: string): Promise<Place[]> {
    const response = await this.call('places.suggestions', () =>
      this.client.request<DuffelPlace[]>('GET', '/places/suggestions', {
        query: { query },
        timeoutMs: 10_000,
      }),
    );
    return (response.data ?? []).map(mapPlace).filter((p): p is Place => p !== null);
  }

  /** POST /air/offer_requests (return_offers=false) followed by a paginated GET /air/offers. */
  async searchOffers(criteria: SearchCriteria, limit: number): Promise<OffersPage> {
    const slices = [
      {
        origin: criteria.origin,
        destination: criteria.destination,
        departure_date: criteria.departureDate,
      },
    ];
    if (criteria.returnDate) {
      slices.push({
        origin: criteria.destination,
        destination: criteria.origin,
        departure_date: criteria.returnDate,
      });
    }
    // Duffel: adults use type "adult"; under-18s are described by age (it derives child/infant).
    const passengers = [
      ...Array.from({ length: criteria.adults }, () => ({ type: 'adult' as const })),
      ...criteria.childAges.map((age) => ({ age })),
      ...criteria.infantAges.map((age) => ({ age })),
    ];

    const offerRequest = await this.call('offer_requests.create', () =>
      this.client.request<DuffelOfferRequest>('POST', '/air/offer_requests', {
        query: { return_offers: false, supplier_timeout: 20_000 },
        body: {
          slices,
          passengers,
          cabin_class: criteria.cabinClass,
          max_connections: criteria.maxConnections ?? 1,
        },
      }),
    );
    this.assertMode(offerRequest.data.live_mode);
    return this.listOffers(offerRequest.data.id, null, limit);
  }

  async listOffers(
    offerRequestId: string,
    cursor: string | null,
    limit: number,
  ): Promise<OffersPage> {
    const response = await this.call('offers.list', () =>
      this.client.request<DuffelOffer[]>('GET', '/air/offers', {
        query: {
          offer_request_id: offerRequestId,
          limit,
          sort: 'total_amount',
          after: cursor ?? undefined,
        },
      }),
    );
    const meta = (response as DuffelListResponse<DuffelOffer>).meta;
    return {
      offerRequestId,
      offers: dedupeOffers((response.data ?? []).map(mapOffer)),
      nextCursor: meta?.after ?? null,
    };
  }

  /** GET /air/offers/:id — always returns the latest price and availability. */
  async getOffer(offerId: string): Promise<FlightOffer> {
    const response = await this.call('offers.get', () =>
      this.client.request<DuffelOffer>('GET', `/air/offers/${encodeURIComponent(offerId)}`, {
        query: { return_available_services: false },
      }),
    );
    this.assertMode(response.data.live_mode);
    const offer = mapOffer(response.data);
    if (Date.parse(offer.expiresAt) <= Date.now()) {
      throw new AppError(
        410,
        ErrorCodes.OFFER_EXPIRED,
        'This offer has expired. Please search again.',
      );
    }
    return offer;
  }

  /**
   * POST /air/orders — creates a real airline order (in test mode: with Duffel Airways / test
   * suppliers and the test balance). Payment uses the Duffel "balance" payment type.
   */
  async createOrder(input: CreateOrderInput): Promise<ProviderOrder> {
    const { offer, passengers, contact, bookingId } = input;

    // Each infant must be linked to a different adult who will travel with them.
    const infantIds = offer.passengers
      .filter((p) => p.type === 'infant_without_seat')
      .map((p) => p.id);
    const adultIds = offer.passengers.filter((p) => p.type === 'adult').map((p) => p.id);
    const infantByAdult = new Map(adultIds.map((adultId, i) => [adultId, infantIds[i]]));

    const body = {
      type: 'instant',
      selected_offers: [offer.id],
      passengers: passengers.map((p) => ({
        id: p.id,
        title: p.title,
        gender: p.gender,
        given_name: p.givenName,
        family_name: p.familyName,
        born_on: p.bornOn,
        email: contact.email,
        phone_number: contact.phone,
        ...(infantByAdult.get(p.id) ? { infant_passenger_id: infantByAdult.get(p.id) } : {}),
        ...(p.identityDocument
          ? {
              identity_documents: [
                {
                  type: p.identityDocument.type,
                  unique_identifier: p.identityDocument.uniqueIdentifier,
                  issuing_country_code: p.identityDocument.issuingCountryCode,
                  expires_on: p.identityDocument.expiresOn,
                },
              ],
            }
          : {}),
      })),
      payments: [{ type: 'balance', currency: offer.totalCurrency, amount: offer.totalAmount }],
      metadata: { booking_id: bookingId },
    };

    const response = await this.call('orders.create', () =>
      // Order creation can be slow at the airline: allow longer than normal requests.
      this.client.request<DuffelOrder>('POST', '/air/orders', { body, timeoutMs: 90_000 }),
    );
    this.assertMode(response.data.live_mode);
    return mapOrder(response.data);
  }

  /** GET /air/orders/:id */
  async getOrder(orderId: string): Promise<ProviderOrder> {
    const response = await this.call('orders.get', () =>
      this.client.request<DuffelOrder>('GET', `/air/orders/${encodeURIComponent(orderId)}`),
    );
    return mapOrder(response.data);
  }

  /** Defence in depth: never accept live data while configured for test mode. */
  private assertMode(liveMode: boolean) {
    if (liveMode !== this.expectedLiveMode) {
      throw new AppError(
        500,
        ErrorCodes.CONFIG_ERROR,
        `Provider returned ${liveMode ? 'live' : 'test'} data but the app is configured for ${this.expectedLiveMode ? 'live' : 'test'} mode.`,
      );
    }
  }
}
