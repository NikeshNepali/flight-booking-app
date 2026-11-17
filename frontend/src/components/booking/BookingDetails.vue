<script setup lang="ts">
import { computed } from 'vue';
import { Mail } from 'lucide-vue-next';
import FareConditions from '@/components/flights/FareConditions.vue';
import SliceTimeline from '@/components/flights/SliceTimeline.vue';
import BookingStatus from './BookingStatus.vue';
import type { BookingView } from '@/types';
import { formatBirthDate, formatDateTime, formatMoney, passengerTypeLabel } from '@/utils/format';

const props = defineProps<{ booking: BookingView }>();
const sliceTitle = (i: number) =>
  props.booking.itinerary?.slices.length === 2
    ? i === 0
      ? 'Outbound'
      : 'Return'
    : `Flight ${i + 1}`;
const hasTickets = computed(() => props.booking.passengers.some((p) => p.ticketNumbers.length > 0));
</script>

<template>
  <div class="space-y-6">
    <section class="card p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Airline booking reference
          </p>
          <p class="mt-1 font-mono text-3xl font-bold tracking-widest text-slate-900">
            {{ booking.bookingReference ?? '—' }}
          </p>
          <p v-if="booking.itinerary" class="mt-1 text-sm text-slate-600">
            {{ booking.itinerary.owner.name }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium tracking-wide text-slate-500 uppercase">Total paid</p>
          <p class="mt-1 text-2xl font-bold">
            {{ formatMoney(booking.totalAmount, booking.currency) }}
          </p>
        </div>
      </div>
      <div class="mt-4"><BookingStatus :booking="booking" /></div>
      <dl class="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-slate-500">Provider order ID</dt>
          <dd class="font-mono text-xs break-all">
            {{ booking.providerOrderId ?? 'Not yet assigned' }}
          </dd>
        </div>
        <div>
          <dt class="text-slate-500">Booked on</dt>
          <dd>{{ formatDateTime(booking.createdAt) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">Contact</dt>
          <dd class="inline-flex items-center gap-1 break-all">
            <Mail class="size-3.5" aria-hidden="true" />{{ booking.contactEmail }}
          </dd>
        </div>
      </dl>
    </section>

    <template v-if="booking.itinerary">
      <SliceTimeline
        v-for="(slice, i) in booking.itinerary.slices"
        :key="slice.id"
        :slice="slice"
        :title="sliceTitle(i)"
      />
    </template>

    <section class="card p-5">
      <h3 class="mb-3 font-semibold">Passengers</h3>
      <ul class="divide-y divide-slate-100">
        <li
          v-for="p in booking.passengers"
          :key="p.providerPassengerId"
          class="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
        >
          <div>
            <p class="font-medium">
              {{ p.title ? `${p.title.charAt(0).toUpperCase()}${p.title.slice(1)} ` : ''
              }}{{ p.givenName }} {{ p.familyName }}
            </p>
            <p class="text-xs text-slate-500">
              {{ passengerTypeLabel(p.passengerType) }} · born {{ formatBirthDate(p.dateOfBirth) }}
            </p>
          </div>
          <p v-if="p.ticketNumbers.length" class="text-xs">
            E-ticket: <span class="font-mono">{{ p.ticketNumbers.join(', ') }}</span>
          </p>
        </li>
      </ul>
      <p v-if="!hasTickets && booking.status === 'confirmed'" class="mt-2 text-xs text-slate-500">
        Ticket numbers will appear here once the airline issues them.
      </p>
    </section>

    <section v-if="booking.itinerary" class="card p-5">
      <FareConditions :conditions="booking.itinerary.conditions" />
    </section>
  </div>
</template>
