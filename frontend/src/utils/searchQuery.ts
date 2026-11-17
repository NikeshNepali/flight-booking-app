import type { LocationQuery } from 'vue-router';
import type { CabinClass, SearchParams } from '@/types';

const CABINS: CabinClass[] = ['economy', 'premium_economy', 'business', 'first'];

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function ages(value: string): number[] {
  return value
    ? value
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n))
    : [];
}

/** Search params live in the URL so results can be refreshed, shared and bookmarked. */
export function toQuery(params: SearchParams): Record<string, string> {
  const query: Record<string, string> = {
    from: params.origin,
    to: params.destination,
    depart: params.departureDate,
    adults: String(params.adults),
    cabin: params.cabinClass,
  };
  if (params.originLabel) query.fromName = params.originLabel;
  if (params.destinationLabel) query.toName = params.destinationLabel;
  if (params.returnDate) query.return = params.returnDate;
  if (params.childAges.length) query.children = params.childAges.join(',');
  if (params.infantAges.length) query.infants = params.infantAges.join(',');
  return query;
}

export function fromQuery(query: LocationQuery): SearchParams | null {
  const origin = str(query.from).toUpperCase();
  const destination = str(query.to).toUpperCase();
  const departureDate = str(query.depart);
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || !departureDate) return null;
  const cabin = str(query.cabin) as CabinClass;
  return {
    origin,
    originLabel: str(query.fromName) || undefined,
    destination,
    destinationLabel: str(query.toName) || undefined,
    departureDate,
    returnDate: str(query.return) || undefined,
    adults: Math.max(1, Number(str(query.adults)) || 1),
    childAges: ages(str(query.children)),
    infantAges: ages(str(query.infants)),
    cabinClass: CABINS.includes(cabin) ? cabin : 'economy',
  };
}
