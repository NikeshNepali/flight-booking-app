<script setup lang="ts">
import { computed, ref } from 'vue';
import { CircleCheck, Clock, Copy, KeyRound, Search, Ticket } from 'lucide-vue-next';
import BookingDetails from '@/components/booking/BookingDetails.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { loadLastBooking } from '@/composables/useLastBooking';

const booking = ref(loadLastBooking());
const copied = ref<'code' | 'link' | null>(null);

const lookupLink = computed(() =>
  booking.value?.lookupToken
    ? `${window.location.origin}/booking/lookup#code=${booking.value.lookupToken}`
    : '',
);

async function copy(text: string, what: 'code' | 'link') {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = what;
    setTimeout(() => (copied.value = null), 2000);
  } catch {
    copied.value = null;
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <EmptyState
      v-if="!booking"
      :icon="Ticket"
      title="No recent booking in this tab"
      message="If you already booked, use your private booking code to view it."
    >
      <RouterLink :to="{ name: 'lookup' }" class="btn-primary"
        ><Search class="size-4" aria-hidden="true" />Find my booking</RouterLink
      >
    </EmptyState>

    <template v-else>
      <header class="mb-6 text-center">
        <span
          class="mx-auto grid size-14 place-items-center rounded-full"
          :class="
            booking.status === 'confirmed'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-amber-50 text-amber-600'
          "
        >
          <component
            :is="booking.status === 'confirmed' ? CircleCheck : Clock"
            class="size-8"
            aria-hidden="true"
          />
        </span>
        <h1 class="mt-4 text-2xl font-bold sm:text-3xl">
          {{
            booking.status === 'confirmed'
              ? 'Your flight is booked'
              : 'Your booking is being confirmed'
          }}
        </h1>
        <p class="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          <template v-if="booking.status === 'confirmed' && booking.ticketingStatus === 'issued'">
            The airline has confirmed your reservation and issued your e-tickets.
          </template>
          <template v-else-if="booking.status === 'confirmed'">
            The airline has confirmed your reservation. E-tickets have not been issued yet — check
            back using your booking code.
          </template>
          <template v-else>
            {{ booking.failure?.message ?? 'We have not received the airline confirmation yet.' }}
            Please do not book again.
          </template>
        </p>
      </header>

      <section v-if="booking.lookupToken" class="card mb-6 border-primary-200 bg-primary-50/50 p-5">
        <h2 class="flex items-center gap-2 font-semibold">
          <KeyRound class="size-4 text-primary-600" aria-hidden="true" />Save your private booking
          code
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          This code is the only way to view this booking on this site (no account needed). We can't
          show it again, so save it somewhere safe. Anyone with the code can see the booking.
        </p>
        <div class="mt-3 flex flex-col gap-2 sm:flex-row">
          <code
            class="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm break-all"
            >{{ booking.lookupToken }}</code
          >
          <button type="button" class="btn-secondary" @click="copy(booking.lookupToken!, 'code')">
            <Copy class="size-4" aria-hidden="true" />{{
              copied === 'code' ? 'Copied!' : 'Copy code'
            }}
          </button>
          <button type="button" class="btn-secondary" @click="copy(lookupLink, 'link')">
            <Copy class="size-4" aria-hidden="true" />{{
              copied === 'link' ? 'Copied!' : 'Copy private link'
            }}
          </button>
        </div>
      </section>

      <BookingDetails :booking="booking" />

      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <RouterLink :to="{ name: 'lookup' }" class="btn-secondary">Check booking status</RouterLink>
        <RouterLink to="/" class="btn-primary">Book another flight</RouterLink>
      </div>
    </template>
  </div>
</template>
