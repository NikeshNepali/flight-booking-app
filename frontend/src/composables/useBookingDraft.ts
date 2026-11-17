import { reactive } from 'vue';
import type { ContactForm, FlightOffer, PassengerForm } from '@/types';

/**
 * In-memory checkout state shared between the details, passenger and checkout pages.
 * Passenger data is deliberately NOT written to localStorage/sessionStorage: it stays in
 * memory only and is cleared after booking (a page refresh means re-entering details).
 */
interface BookingDraft {
  offer: FlightOffer | null;
  passengers: PassengerForm[];
  contact: ContactForm;
  /** One key per checkout attempt: protects against double submissions and retries. */
  idempotencyKey: string;
}

const draft = reactive<BookingDraft>({
  offer: null,
  passengers: [],
  contact: { email: '', phone: '' },
  idempotencyKey: crypto.randomUUID(),
});

function emptyPassenger(p: FlightOffer['passengers'][number]): PassengerForm {
  return {
    id: p.id,
    type: p.type,
    age: p.age,
    title: '',
    gender: '',
    givenName: '',
    familyName: '',
    bornOn: '',
    passportNumber: '',
    passportCountry: '',
    passportExpiresOn: '',
  };
}

export function useBookingDraft() {
  /** Starts (or continues) a checkout for an offer, keeping already-entered details for the same offer. */
  function setOffer(offer: FlightOffer) {
    const sameOffer = draft.offer?.id === offer.id;
    draft.offer = offer;
    if (!sameOffer || draft.passengers.length !== offer.passengers.length) {
      draft.passengers = offer.passengers.map(emptyPassenger);
      draft.idempotencyKey = crypto.randomUUID();
    }
  }

  function newAttempt() {
    draft.idempotencyKey = crypto.randomUUID();
  }

  function clear() {
    draft.offer = null;
    draft.passengers = [];
    draft.contact = { email: '', phone: '' };
    draft.idempotencyKey = crypto.randomUUID();
  }

  function hasPassengerDetails(offerId: string): boolean {
    return (
      draft.offer?.id === offerId &&
      draft.passengers.length > 0 &&
      draft.passengers.every((p) => p.givenName && p.familyName && p.bornOn) &&
      Boolean(draft.contact.email && draft.contact.phone)
    );
  }

  return { draft, setOffer, newAttempt, clear, hasPassengerDetails };
}
