<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  ArrowLeft,
  CircleAlert,
  FlaskConical,
  Loader2,
  Lock,
  Pencil,
  TrendingUp,
} from 'lucide-vue-next';
import BookingSteps from '@/components/booking/BookingSteps.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import FareConditions from '@/components/flights/FareConditions.vue';
import OfferExpiry from '@/components/flights/OfferExpiry.vue';
import PriceBreakdown from '@/components/flights/PriceBreakdown.vue';
import SliceSummary from '@/components/flights/SliceSummary.vue';
import { useBookingDraft } from '@/composables/useBookingDraft';
import { saveLastBooking } from '@/composables/useLastBooking';
import { ApiError } from '@/services/api';
import { createBooking } from '@/services/bookings';
import { getOffer } from '@/services/flights';
import { formatBirthDate, formatLocalDate, formatMoney, passengerTypeLabel } from '@/utils/format';

const props = defineProps<{ offerId: string }>();
const router = useRouter();
const { draft, newAttempt, clear, hasPassengerDetails } = useBookingDraft();

const refreshing = ref(true);
const refreshError = ref<ApiError | null>(null);
const priceChangedFrom = ref<{ amount: string; currency: string } | null>(null);
const accepted = ref(false);
const submitting = ref(false);
const submitError = ref<ApiError | null>(null);
const expired = ref(false);

/** Re-fetch the offer so the user books at the latest price — never a stale one. */
async function refreshOffer() {
  if (!draft.offer) return;
  refreshing.value = true;
  refreshError.value = null;
  try {
    const latest = await getOffer(props.offerId);
    if (
      latest.totalAmount !== draft.offer.totalAmount ||
      latest.totalCurrency !== draft.offer.totalCurrency
    ) {
      priceChangedFrom.value = {
        amount: draft.offer.totalAmount,
        currency: draft.offer.totalCurrency,
      };
      accepted.value = false;
    }
    draft.offer = latest;
  } catch (e) {
    refreshError.value =
      e instanceof ApiError ? e : new ApiError('Could not confirm the latest price.', 'UNKNOWN', 0);
  } finally {
    refreshing.value = false;
  }
}

onMounted(() => {
  if (!hasPassengerDetails(props.offerId)) {
    router.replace({ name: 'passengers', params: { offerId: props.offerId } });
    return;
  }
  refreshOffer();
});

// Warn before leaving while the booking request is in flight.
function beforeUnload(e: BeforeUnloadEvent) {
  if (submitting.value) e.preventDefault();
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() =>
  submitting.value ? window.confirm('Your booking is being processed. Leave anyway?') : true,
);

const canBook = computed(
  () =>
    accepted.value &&
    !submitting.value &&
    !refreshing.value &&
    !refreshError.value &&
    !expired.value,
);

async function book() {
  if (!draft.offer || !canBook.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    const { booking } = await createBooking({
      idempotencyKey: draft.idempotencyKey,
      offerId: draft.offer.id,
      expectedTotal: { amount: draft.offer.totalAmount, currency: draft.offer.totalCurrency },
      contact: draft.contact,
      passengers: draft.passengers,
      includeDocuments: draft.offer.identityDocumentsRequired,
    });
    saveLastBooking(booking);
    clear(); // passenger data is no longer needed in memory
    submitting.value = false;
    router.replace({ name: 'confirmation' });
  } catch (e) {
    submitting.value = false;
    const error = e instanceof ApiError ? e : new ApiError('Booking failed.', 'UNKNOWN', 0);
    submitError.value = error;
    if (error.code === 'PRICE_CHANGED') {
      const details = error.details as { totalAmount?: string; totalCurrency?: string } | undefined;
      if (details?.totalAmount && details.totalCurrency) {
        priceChangedFrom.value = {
          amount: draft.offer.totalAmount,
          currency: draft.offer.totalCurrency,
        };
        draft.offer = {
          ...draft.offer,
          totalAmount: details.totalAmount,
          totalCurrency: details.totalCurrency,
        };
        accepted.value = false;
      }
      newAttempt();
    } else if (error.code === 'NETWORK_TIMEOUT' || error.code === 'NETWORK_ERROR') {
      // Keep the same idempotency key: retrying cannot create a second booking.
    } else {
      // The server rejected this attempt definitively; a retry is a new attempt.
      newAttempt();
    }
  }
}

const errorTitle = computed(() => {
  switch (submitError.value?.code) {
    case 'PRICE_CHANGED':
      return 'The price has changed';
    case 'OFFER_EXPIRED':
      return 'This offer has expired';
    case 'INVALID_PASSENGERS':
    case 'VALIDATION_ERROR':
      return 'Please check the passenger details';
    case 'PAYMENT_FAILED':
      return 'Payment failed — you have not been charged for a booking';
    case 'NETWORK_TIMEOUT':
    case 'NETWORK_ERROR':
      return 'We lost connection while booking';
    default:
      return 'Booking was not completed';
  }
});
const errorProblems = computed(() => {
  const details = submitError.value?.details as { problems?: { message: string }[] } | undefined;
  return [
    ...(details?.problems ?? []).map((p) => p.message),
    ...(submitError.value?.fieldErrors ?? []).map((f) => `${f.path}: ${f.message}`),
  ];
});
const sliceLabel = (i: number) =>
  draft.offer?.slices.length === 2 ? (i === 0 ? 'Outbound' : 'Return') : `Flight ${i + 1}`;
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-6">
    <button
      type="button"
      class="btn-ghost mb-4 -ml-3"
      :disabled="submitting"
      @click="router.push({ name: 'passengers', params: { offerId } })"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />Back to passengers
    </button>
    <BookingSteps :current="3" />
    <h1 class="mb-6 text-2xl font-semibold">Review and book</h1>

    <div v-if="!draft.offer" />
    <div v-else class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-4">
        <section class="card p-5">
          <h2 class="mb-4 font-semibold">Flights · {{ draft.offer.owner.name }}</h2>
          <div class="space-y-5">
            <div v-for="(slice, i) in draft.offer.slices" :key="slice.id">
              <p class="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
                {{ sliceLabel(i) }} · {{ formatLocalDate(slice.departingAt) }}
              </p>
              <SliceSummary :slice="slice" />
            </div>
          </div>
          <RouterLink
            :to="{ name: 'flight-details', params: { offerId } }"
            class="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline"
          >
            View full itinerary
          </RouterLink>
        </section>

        <section class="card p-5">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold">Passengers</h2>
            <RouterLink
              :to="{ name: 'passengers', params: { offerId } }"
              class="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
            >
              <Pencil class="size-3.5" aria-hidden="true" />Edit
            </RouterLink>
          </div>
          <ul class="divide-y divide-slate-100 text-sm">
            <li v-for="p in draft.passengers" :key="p.id" class="py-2.5">
              <p class="font-medium">{{ p.givenName }} {{ p.familyName }}</p>
              <p class="text-xs text-slate-500">
                {{ passengerTypeLabel(p.type, p.age) }} · born
                {{ p.bornOn ? formatBirthDate(p.bornOn) : '—' }}
                <template v-if="draft.offer.identityDocumentsRequired">
                  · passport ending {{ p.passportNumber.slice(-3).toUpperCase() }}</template
                >
              </p>
            </li>
          </ul>
          <p class="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
            Contact: {{ draft.contact.email }} · {{ draft.contact.phone }}
          </p>
        </section>

        <section class="card p-5">
          <FareConditions :conditions="draft.offer.conditions" />
        </section>
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div
          v-if="priceChangedFrom"
          class="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          role="alert"
        >
          <TrendingUp class="size-5 shrink-0" aria-hidden="true" />
          <p>
            The airline changed the price from
            {{ formatMoney(priceChangedFrom.amount, priceChangedFrom.currency) }} to
            <strong>{{ formatMoney(draft.offer.totalAmount, draft.offer.totalCurrency) }}</strong>.
            Please confirm the new total to continue.
          </p>
        </div>

        <ErrorState
          v-if="refreshError"
          :title="
            refreshError.code === 'OFFER_EXPIRED'
              ? 'This offer has expired'
              : 'Could not confirm the latest price'
          "
          :message="
            refreshError.code === 'OFFER_EXPIRED'
              ? 'Please search again for available flights.'
              : refreshError.message
          "
          :retry-label="refreshError.code === 'OFFER_EXPIRED' ? undefined : 'Try again'"
          @retry="refreshOffer"
        >
          <RouterLink to="/" class="btn-secondary">New search</RouterLink>
        </ErrorState>

        <div v-else class="card space-y-5 p-5">
          <div
            v-if="refreshing"
            class="flex items-center gap-2 text-sm text-slate-600"
            aria-live="polite"
          >
            <Loader2 class="size-4 animate-spin" aria-hidden="true" />Confirming the latest price
            with the airline…
          </div>
          <PriceBreakdown :offer="draft.offer" />
          <OfferExpiry :expires-at="draft.offer.expiresAt" @expired="expired = true" />

          <div class="rounded-xl bg-violet-50 p-3 text-xs text-violet-900">
            <p class="flex items-center gap-1.5 font-semibold">
              <FlaskConical class="size-3.5" aria-hidden="true" />Payment
            </p>
            <p class="mt-1">
              <template v-if="!draft.offer.liveMode">
                Test mode: the order is paid from your Duffel <strong>test balance</strong>. No card
                is needed and no real money moves.
              </template>
              <template v-else
                >Paid from the agency's Duffel balance. Card payment is not enabled in this
                build.</template
              >
            </p>
          </div>

          <label class="flex cursor-pointer items-start gap-2 text-sm">
            <input
              v-model="accepted"
              type="checkbox"
              class="mt-0.5 size-4 rounded accent-primary-600"
              :disabled="submitting"
            />
            <span
              >I have checked the passenger names and dates, and I accept the fare conditions and
              the airline's terms.</span
            >
          </label>

          <button
            type="button"
            class="btn-primary w-full py-3 text-base"
            :disabled="!canBook"
            :aria-busy="submitting"
            @click="book"
          >
            <Loader2 v-if="submitting" class="size-5 animate-spin" aria-hidden="true" />
            <Lock v-else class="size-4" aria-hidden="true" />
            {{
              submitting
                ? 'Booking with the airline…'
                : `Book now · ${formatMoney(draft.offer.totalAmount, draft.offer.totalCurrency)}`
            }}
          </button>
          <p v-if="submitting" class="text-center text-xs text-slate-500" aria-live="polite">
            This can take up to a minute. Please don't close or refresh this page.
          </p>

          <div
            v-if="submitError"
            class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"
            role="alert"
          >
            <p class="flex items-center gap-1.5 font-semibold">
              <CircleAlert class="size-4" aria-hidden="true" />{{ errorTitle }}
            </p>
            <p class="mt-1">{{ submitError.message }}</p>
            <ul v-if="errorProblems.length" class="mt-2 list-disc pl-5 text-xs">
              <li v-for="(problem, i) in errorProblems" :key="i">{{ problem }}</li>
            </ul>
            <p
              v-if="submitError.code === 'NETWORK_TIMEOUT' || submitError.code === 'NETWORK_ERROR'"
              class="mt-2 text-xs"
            >
              Pressing “Book now” again is safe — it will not create a second booking.
            </p>
            <RouterLink
              v-if="submitError.code === 'OFFER_EXPIRED'"
              to="/"
              class="mt-2 inline-block font-medium underline"
              >Search again</RouterLink
            >
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
