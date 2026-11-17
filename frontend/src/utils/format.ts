import type { CabinClass, Condition, PassengerType } from '@/types';

export function formatMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || !currency) return '—';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'Duration unavailable';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m}m` : `${h}h${m ? ` ${m}m` : ''}`;
}

/**
 * Provider times are *local* to the airport and have no offset (e.g. "2027-03-15T08:00:00").
 * We therefore read the clock time straight from the string instead of converting time zones.
 */
export function formatLocalTime(localIso: string): string {
  return localIso.slice(11, 16);
}

export function formatLocalDate(localIso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(`${localIso.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...opts,
  }).format(date);
}

/** Short time-zone label (e.g. "GMT", "EST") for a local time at an airport. */
export function timeZoneLabel(localIso: string, timeZone: string | null): string {
  if (!timeZone) return '';
  try {
    // Treating the local time as UTC is off by the zone's offset, which only matters within
    // hours of a DST switch — acceptable for a display label.
    const instant = new Date(`${localIso.slice(0, 19)}Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(instant);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Number of calendar days between two local dates ("+1" for overnight arrivals). */
export function dayOffset(departLocal: string, arriveLocal: string): number {
  const a = Date.parse(`${departLocal.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${arriveLocal.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function formatBirthDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

export const cabinLabels: Record<CabinClass, string> = {
  economy: 'Economy',
  premium_economy: 'Premium economy',
  business: 'Business',
  first: 'First',
};

export function stopsLabel(stops: number): string {
  if (stops === 0) return 'Nonstop';
  return stops === 1 ? '1 stop' : `${stops} stops`;
}

export function passengerTypeLabel(type: PassengerType | null, age?: number | null): string {
  if (type === 'adult') return 'Adult';
  if (type === 'child') return age != null ? `Child (age ${age})` : 'Child';
  if (type === 'infant_without_seat')
    return age != null ? `Infant (age ${age}, on lap)` : 'Infant (on lap)';
  return 'Passenger';
}

/** Human-readable fare condition. null = provider didn't say; we never guess. */
export function conditionLabel(condition: Condition | null, action: 'Refunds' | 'Changes'): string {
  if (!condition) return `${action}: information not provided by the airline`;
  if (!condition.allowed) return `${action} not allowed`;
  if (condition.penaltyAmount && Number(condition.penaltyAmount) > 0) {
    return `${action} allowed (fee ${formatMoney(condition.penaltyAmount, condition.penaltyCurrency)})`;
  }
  if (condition.penaltyAmount !== null) return `${action} allowed free of charge`;
  return `${action} allowed (fee may apply)`;
}

export function baggageSummary(
  baggage: { type: 'checked' | 'carry_on'; quantity: number }[] | undefined,
): string {
  if (!baggage || baggage.length === 0) return 'Baggage info unavailable';
  const checked = baggage.filter((b) => b.type === 'checked').reduce((n, b) => n + b.quantity, 0);
  const carry = baggage.filter((b) => b.type === 'carry_on').reduce((n, b) => n + b.quantity, 0);
  const parts = [];
  parts.push(checked ? `${checked} checked bag${checked > 1 ? 's' : ''}` : 'No checked bag');
  if (carry) parts.push(`${carry} carry-on`);
  return parts.join(' · ');
}
