import type { BookingView } from '@/types';

/**
 * Keeps the just-created booking for the confirmation page. Only the booking view (which the
 * user is entitled to see) is kept, in sessionStorage, so a refresh of the confirmation page works.
 */
const KEY = 'skyroute:last-booking';

export function saveLastBooking(booking: BookingView) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(booking));
  } catch {
    /* storage unavailable — confirmation still shows from memory */
  }
  memory = booking;
}

let memory: BookingView | null = null;

export function loadLastBooking(): BookingView | null {
  if (memory) return memory;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BookingView) : null;
  } catch {
    return null;
  }
}
