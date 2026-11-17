<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Lock } from 'lucide-vue-next';
import BookingSteps from '@/components/booking/BookingSteps.vue';
import PassengerFields from '@/components/booking/PassengerFields.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import { useBookingDraft } from '@/composables/useBookingDraft';
import { ApiError } from '@/services/api';
import { getOffer } from '@/services/flights';
import { formatMoney } from '@/utils/format';
import { validatePassengers } from '@/utils/passengerValidation';

const props = defineProps<{ offerId: string }>();
const router = useRouter();
const { draft, setOffer } = useBookingDraft();

const loading = ref(false);
const loadError = ref<ApiError | null>(null);
const errors = ref<Record<string, string>>({});

async function ensureOffer() {
  if (draft.offer?.id === props.offerId) return;
  loading.value = true;
  loadError.value = null;
  try {
    setOffer(await getOffer(props.offerId));
  } catch (e) {
    loadError.value =
      e instanceof ApiError ? e : new ApiError('Could not load this flight.', 'UNKNOWN', 0);
  } finally {
    loading.value = false;
  }
}
onMounted(ensureOffer);

async function submit() {
  if (!draft.offer) return;
  errors.value = validatePassengers(draft.offer, draft.passengers, draft.contact);
  if (Object.keys(errors.value).length > 0) {
    await nextTick();
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    return;
  }
  router.push({ name: 'checkout', params: { offerId: props.offerId } });
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-6">
    <button
      type="button"
      class="btn-ghost mb-4 -ml-3"
      @click="router.push({ name: 'flight-details', params: { offerId } })"
    >
      <ArrowLeft class="size-4" aria-hidden="true" />Back to flight
    </button>
    <BookingSteps :current="2" />
    <h1 class="mb-1 text-2xl font-semibold">Who's travelling?</h1>
    <p class="mb-6 text-sm text-slate-600">
      We only ask for what the airline needs to issue your booking.
    </p>

    <div v-if="loading" class="card space-y-3 p-5" aria-busy="true">
      <div class="skeleton h-5 w-40" />
      <div class="skeleton h-10 w-full" />
      <div class="skeleton h-10 w-full" />
    </div>

    <ErrorState
      v-else-if="loadError"
      :title="
        loadError.code === 'OFFER_EXPIRED'
          ? 'This offer is no longer available'
          : 'Could not load flight'
      "
      :message="
        loadError.code === 'OFFER_EXPIRED'
          ? 'Please search again for current prices.'
          : loadError.message
      "
      :retry-label="loadError.code === 'OFFER_EXPIRED' ? undefined : 'Try again'"
      @retry="ensureOffer"
    >
      <RouterLink to="/" class="btn-secondary">New search</RouterLink>
    </ErrorState>

    <form v-else-if="draft.offer" class="space-y-4" novalidate @submit.prevent="submit">
      <PassengerFields
        v-for="(passenger, index) in draft.passengers"
        :key="passenger.id"
        v-model="draft.passengers[index]!"
        :index="index"
        :require-documents="draft.offer.identityDocumentsRequired"
        :errors="errors"
      />

      <fieldset class="card p-5">
        <legend class="sr-only">Contact details</legend>
        <h3 class="font-semibold">Contact details</h3>
        <p class="mb-4 text-xs text-slate-500">
          Shared with the airline for booking updates and disruptions.
        </p>
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="contact-email" class="field-label">Email</label>
            <input
              id="contact-email"
              v-model="draft.contact.email"
              type="email"
              class="field-input"
              autocomplete="email"
              :aria-invalid="Boolean(errors['contact.email'])"
              required
            />
            <p v-if="errors['contact.email']" class="field-error">{{ errors['contact.email'] }}</p>
          </div>
          <div>
            <label for="contact-phone" class="field-label">Phone number</label>
            <input
              id="contact-phone"
              v-model="draft.contact.phone"
              type="tel"
              class="field-input"
              autocomplete="tel"
              placeholder="+44 20 8016 0509"
              :aria-invalid="Boolean(errors['contact.phone'])"
              required
            />
            <p v-if="errors['contact.phone']" class="field-error">{{ errors['contact.phone'] }}</p>
          </div>
        </div>
      </fieldset>

      <p v-if="Object.keys(errors).length" class="text-sm text-red-600" role="alert">
        Please fix the highlighted fields.
      </p>

      <div
        class="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center"
      >
        <p class="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Lock class="size-3.5" aria-hidden="true" />Details are kept in this browser tab only
          until you book.
        </p>
        <button type="submit" class="btn-primary py-3">
          Review booking · {{ formatMoney(draft.offer.totalAmount, draft.offer.totalCurrency)
          }}<ArrowRight class="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  </div>
</template>
