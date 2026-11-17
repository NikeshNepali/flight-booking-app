<script setup lang="ts">
import { computed } from 'vue';
import type { BookingView } from '@/types';

const props = defineProps<{ booking: BookingView }>();

const badges = computed(() => {
  const b = props.booking;
  const list: { label: string; tone: string; help: string }[] = [];
  const status = {
    confirmed: {
      label: 'Reservation confirmed',
      tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
      help: 'The airline has created your booking.',
    },
    pending: {
      label: 'Pending confirmation',
      tone: 'bg-amber-50 text-amber-800 ring-amber-200',
      help: 'We are still waiting for the airline to confirm.',
    },
    failed: {
      label: 'Booking failed',
      tone: 'bg-red-50 text-red-800 ring-red-200',
      help: 'No airline booking was created.',
    },
    cancelled: {
      label: 'Cancelled',
      tone: 'bg-slate-100 text-slate-700 ring-slate-300',
      help: 'This booking was cancelled.',
    },
  }[b.status];
  list.push(status);
  if (b.status === 'confirmed') {
    list.push(
      b.ticketingStatus === 'issued'
        ? {
            label: 'Ticketed',
            tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
            help: 'E-tickets have been issued.',
          }
        : {
            label: 'Tickets not yet issued',
            tone: 'bg-amber-50 text-amber-800 ring-amber-200',
            help: 'Your seats are reserved; the airline has not issued e-tickets yet.',
          },
    );
    if (b.paymentStatus === 'awaiting_payment') {
      list.push({
        label: 'Awaiting payment',
        tone: 'bg-amber-50 text-amber-800 ring-amber-200',
        help: 'Payment is still required.',
      });
    }
  }
  if (!b.liveMode)
    list.push({
      label: 'Test booking',
      tone: 'bg-violet-50 text-violet-800 ring-violet-200',
      help: 'Created in test mode — not a real ticket.',
    });
  return list;
});
</script>

<template>
  <ul class="flex flex-wrap gap-2" aria-label="Booking status">
    <li
      v-for="badge in badges"
      :key="badge.label"
      class="rounded-full px-2.5 py-1 text-xs font-semibold ring-1"
      :class="badge.tone"
      :title="badge.help"
    >
      {{ badge.label }}
    </li>
  </ul>
</template>
