import type { CreateOrderInput, ProviderOrder } from './booking.js';
import type { FlightOffer, OffersPage, Place, SearchCriteria } from './flights.js';

/**
 * Everything the app needs from a flight provider. Duffel implements this today;
 * another provider could be swapped in by implementing the same interface.
 * Implementations throw AppError for expected failures (expired offer, timeout, ...).
 */
export interface FlightProvider {
  readonly name: string;
  searchPlaces(query: string): Promise<Place[]>;
  searchOffers(criteria: SearchCriteria, limit: number): Promise<OffersPage>;
  listOffers(offerRequestId: string, cursor: string | null, limit: number): Promise<OffersPage>;
  getOffer(offerId: string): Promise<FlightOffer>;
  createOrder(input: CreateOrderInput): Promise<ProviderOrder>;
  getOrder(orderId: string): Promise<ProviderOrder>;
}
