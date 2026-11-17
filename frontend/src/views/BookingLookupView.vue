<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { KeyRound, Loader2, Search } from 'lucide-vue-next';
import BookingDetails from '@/components/booking/BookingDetails.vue';
import { ApiError } from '@/services/api';
import { lookupBooking } from '@/services/bookings';
import type { BookingView } from '@/types';

const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const booking = ref<BookingView | null>(null);

async function submit() {
  const token = code.value.trim();
  error.value = null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    error.value =
      'Booking codes are 43 characters long (letters, numbers, - and _). Please check and try again.';
    return;
  }
  loading.value = true;
  try {
    booking.value = await lookupBooking(token);
  } catch (e) {
    booking.value = null;
    error.value = e instanceof ApiError ? e.message : 'Could not look up the booking.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // Private links use the URL fragment (#code=…), which browsers never send to servers.
  const match = /code=([A-Za-z0-9_-]{43})/.exec(window.location.hash);
  if (match?.[1]) {
    code.value = match[1];
    submit();
  }
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div class="mx-auto max-w-xl text-center">
      <span
        class="mx-auto grid size-12 place-items-center rounded-full bg-primary-50 text-primary-600"
      >
        <KeyRound class="size-6" aria-hidden="true" />
      </span>
      <h1 class="mt-4 text-2xl font-bold">Find your booking</h1>
      <p class="mt-2 text-sm text-slate-600">
        Enter the private booking code you received after booking.
      </p>
    </div>

    <form class="card mx-auto mt-6 max-w-xl p-5" novalidate @submit.prevent="submit">
      <label for="lookup-code" class="field-label">Booking code</label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <input
          id="lookup-code"
          v-model="code"
          type="text"
          class="field-input font-mono"
          autocomplete="off"
          spellcheck="false"
          placeholder="e.g. 3qG9…"
          :aria-invalid="Boolean(error)"
          aria-describedby="lookup-help"
        />
        <button type="submit" class="btn-primary" :disabled="loading">
          <Loader2 v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
          <Search v-else class="size-4" aria-hidden="true" />Find booking
        </button>
      </div>
      <p v-if="error" class="field-error" role="alert">{{ error }}</p>
      <p id="lookup-help" class="mt-2 text-xs text-slate-500">
        For your privacy, bookings can't be found by email or name. Lost your code? Contact the
        airline with your booking reference.
      </p>
    </form>

    <div v-if="booking" class="mt-8"><BookingDetails :booking="booking" /></div>
  </div>
</template>
