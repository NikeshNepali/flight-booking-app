import type { FlightOffer, HealthInfo, OffersPage, Place, SearchParams } from '@/types';
import { apiRequest } from './api';

export async function searchAirports(query: string, signal?: AbortSignal): Promise<Place[]> {
  const { data } = await apiRequest<Place[]>({ url: '/airports', params: { query }, signal });
  return data;
}

export async function searchFlights(params: SearchParams): Promise<OffersPage> {
  const { data } = await apiRequest<OffersPage>({
    url: '/flights/search',
    method: 'POST',
    data: {
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate || undefined,
      adults: params.adults,
      childAges: params.childAges,
      infantAges: params.infantAges,
      cabinClass: params.cabinClass,
    },
  });
  return data;
}

export async function loadMoreOffers(offerRequestId: string, after: string): Promise<OffersPage> {
  const { data } = await apiRequest<OffersPage>({
    url: `/flights/offer-requests/${encodeURIComponent(offerRequestId)}/offers`,
    params: { after },
  });
  return data;
}

export async function getOffer(offerId: string): Promise<FlightOffer> {
  const { data } = await apiRequest<FlightOffer>({
    url: `/flights/offers/${encodeURIComponent(offerId)}`,
  });
  return data;
}

export async function getHealth(): Promise<HealthInfo> {
  const { data } = await apiRequest<HealthInfo>({ url: '/health' });
  return data;
}
