import type { FlightOffer } from '@/types';

export type SortKey = 'cheapest' | 'fastest' | 'earliest';

export interface OfferFilters {
  airlines: string[]; // empty = all
  maxStops: number | null; // null = any, 0 = nonstop only
  maxPrice: number | null;
}

export function totalDuration(offer: FlightOffer): number {
  return offer.slices.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0);
}

export function maxStopsOf(offer: FlightOffer): number {
  return Math.max(...offer.slices.map((s) => s.stops));
}

export function filterOffers(offers: FlightOffer[], filters: OfferFilters): FlightOffer[] {
  return offers.filter((offer) => {
    if (filters.airlines.length && !filters.airlines.includes(offer.owner.name)) return false;
    if (filters.maxStops !== null && maxStopsOf(offer) > filters.maxStops) return false;
    if (filters.maxPrice !== null && Number(offer.totalAmount) > filters.maxPrice) return false;
    return true;
  });
}

export function sortOffers(offers: FlightOffer[], key: SortKey): FlightOffer[] {
  const copy = [...offers];
  const price = (o: FlightOffer) => Number(o.totalAmount);
  if (key === 'cheapest')
    copy.sort((a, b) => price(a) - price(b) || totalDuration(a) - totalDuration(b));
  if (key === 'fastest')
    copy.sort((a, b) => totalDuration(a) - totalDuration(b) || price(a) - price(b));
  if (key === 'earliest') {
    copy.sort(
      (a, b) =>
        (a.slices[0]?.departingAt ?? '').localeCompare(b.slices[0]?.departingAt ?? '') ||
        price(a) - price(b),
    );
  }
  return copy;
}

/** Airlines present in the results with their cheapest price, for the filter list. */
export function airlineOptions(
  offers: FlightOffer[],
): { name: string; minPrice: number; currency: string }[] {
  const map = new Map<string, { name: string; minPrice: number; currency: string }>();
  for (const o of offers) {
    const price = Number(o.totalAmount);
    const existing = map.get(o.owner.name);
    if (!existing || price < existing.minPrice)
      map.set(o.owner.name, { name: o.owner.name, minPrice: price, currency: o.totalCurrency });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
