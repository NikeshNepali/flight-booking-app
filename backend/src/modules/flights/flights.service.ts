import type { FlightOffer, OffersPage, Place } from '../../types/flights.js';
import type { FlightProvider } from '../../types/provider.js';
import type { SearchInput } from './flights.validation.js';

export const OFFERS_PAGE_SIZE = 50;

export function createFlightsService(provider: FlightProvider) {
  return {
    searchAirports(query: string): Promise<Place[]> {
      return provider.searchPlaces(query);
    },

    searchFlights(input: SearchInput): Promise<OffersPage> {
      return provider.searchOffers(input, OFFERS_PAGE_SIZE);
    },

    loadMoreOffers(offerRequestId: string, cursor: string): Promise<OffersPage> {
      return provider.listOffers(offerRequestId, cursor, OFFERS_PAGE_SIZE);
    },

    /** Always fetches fresh from the provider so price and expiry are current. */
    getOffer(offerId: string): Promise<FlightOffer> {
      return provider.getOffer(offerId);
    },
  };
}

export type FlightsService = ReturnType<typeof createFlightsService>;
