<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Info, TrendingDown, TrendingUp } from 'lucide-vue-next';
import AirlineLogo from '@/components/common/AirlineLogo.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import BookingSteps from '@/components/booking/BookingSteps.vue';
import FareConditions from '@/components/flights/FareConditions.vue';
import OfferExpiry from '@/components/flights/OfferExpiry.vue';
import PriceBreakdown from '@/components/flights/PriceBreakdown.vue';
import SliceTimeline from '@/components/flights/SliceTimeline.vue';
import { useBookingDraft } from '@/composables/useBookingDraft';
import { ApiError } from '@/services/api';
import { getOffer } from '@/services/flights';
import type { FlightOffer } from '@/types';
import { formatMoney } from '@/utils/format';

const props = defineProps<{ offerId: string }>();
const route = useRoute();
const router = useRouter();
const { setOffer } = useBookingDraft();

const offer = ref<FlightOffer | null>(null);
const loading = ref(true);
const error = ref<ApiError | null>(null);
const expired = ref(false);

const seenPrice = computed(() => {
  const p = route.query.p;
  const c = route.query.c;
  return typeof p === 'string' && typeof c === 'string' ? { amount: p, currency: c } : null;
});
const priceChange = computed(() => {
  if (!offer.value || !seenPrice.value) return null;
  if (seenPrice.value.currency !== offer.value.totalCurrency) return 'changed';
  const diff = Number(offer.value.totalAmount) - Number(seenPrice.value.amount);
  if (Math.abs(diff) < 0.005) return null;
  return diff > 0 ? 'up' : 'down';
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    offer.value = await getOffer(props.offerId);
    expired.value = false;
  } catch (e) {
    error.value =
      e instanceof ApiError ? e : new ApiError('Could not load this flight.', 'UNKNOWN', 0);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

function continueToBooking() {
  if (!offer.value) return;
  setOffer(offer.value);
  router.push({ name: 'passengers', params: { offerId: offer.value.id } });
}
const sliceTitle = (i: number) =>
  offer.value?.slices.length === 2 ? (i === 0 ? 'Outbound' : 'Return') : `Flight ${i + 1}`;
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <button type="button" class="btn-ghost mb-4 -ml-3" @click="router.back()">
      <ArrowLeft class="size-4" aria-hidden="true" />Back to results
    </button>
    <BookingSteps :current="1" />

    <div v-if="loading" class="grid gap-6 lg:grid-cols-[1fr_22rem]" aria-busy="true">
      <div class="space-y-4">
        <div class="card space-y-3 p-5">
          <div class="skeleton h-6 w-64" />
          <div class="skeleton h-4 w-40" />
          <div class="skeleton h-40 w-full" />
        </div>
      </div>
      <div class="card space-y-3 p-5">
        <div class="skeleton h-5 w-24" />
        <div class="skeleton h-4 w-full" />
        <div class="skeleton h-4 w-full" />
        <div class="skeleton h-10 w-full" />
      </div>
    </div>

    <ErrorState
      v-else-if="error"
      :title="
        error.code === 'OFFER_EXPIRED'
          ? 'This offer is no longer available'
          : 'Could not load flight details'
      "
      :message="
        error.code === 'OFFER_EXPIRED'
          ? 'Airline prices change often and offers expire. Please search again for the latest prices.'
          : error.message
      "
      :retry-label="error.code === 'OFFER_EXPIRED' ? undefined : 'Try again'"
      @retry="load"
    >
      <RouterLink to="/" class="btn-secondary">New search</RouterLink>
    </ErrorState>

    <div v-else-if="offer" class="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <AirlineLogo :carrier="offer.owner" />
          <div>
            <h1 class="text-xl font-semibold">Your flight with {{ offer.owner.name }}</h1>
            <p class="text-sm text-slate-500">
              Review the itinerary and conditions before booking.
            </p>
          </div>
        </div>
        <SliceTimeline
          v-for="(slice, i) in offer.slices"
          :key="slice.id"
          :slice="slice"
          :title="sliceTitle(i)"
        />
      </div>

      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div
          v-if="priceChange"
          class="flex gap-2 rounded-xl border p-3 text-sm"
          :class="
            priceChange === 'down'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          "
          role="status"
        >
          <component
            :is="priceChange === 'down' ? TrendingDown : TrendingUp"
            class="size-5 shrink-0"
            aria-hidden="true"
          />
          <p>
            The price has changed since your search: was
            {{ formatMoney(seenPrice!.amount, seenPrice!.currency) }}, now
            <strong>{{ formatMoney(offer.totalAmount, offer.totalCurrency) }}</strong>.
          </p>
        </div>

        <div class="card space-y-5 p-5">
          <PriceBreakdown :offer="offer" />
          <FareConditions :conditions="offer.conditions" />
          <div
            v-if="offer.identityDocumentsRequired"
            class="flex gap-2 rounded-xl bg-primary-50 p-3 text-xs text-primary-900"
          >
            <Info class="size-4 shrink-0" aria-hidden="true" />The airline requires passport details
            for every passenger.
          </div>
          <OfferExpiry :expires-at="offer.expiresAt" @expired="expired = true" />
          <button
            type="button"
            class="btn-primary w-full py-3"
            :disabled="expired"
            @click="continueToBooking"
          >
            Continue to booking<ArrowRight class="size-4" aria-hidden="true" />
          </button>
          <p v-if="expired" class="text-sm text-amber-800" role="alert">
            This offer has expired.
            <RouterLink to="/" class="font-medium underline">Search again</RouterLink> for current
            prices.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>
