<script setup lang="ts">
import type { FlightOffer } from '@/types';
import { formatMoney, passengerTypeLabel } from '@/utils/format';

defineProps<{ offer: FlightOffer }>();
</script>

<template>
  <div>
    <h3 class="mb-2 text-sm font-semibold">Price</h3>
    <dl class="space-y-1.5 text-sm">
      <div class="flex justify-between text-slate-600">
        <dt>Fare</dt>
        <dd>
          {{
            offer.baseAmount
              ? formatMoney(offer.baseAmount, offer.baseCurrency ?? offer.totalCurrency)
              : 'Not itemised'
          }}
        </dd>
      </div>
      <div class="flex justify-between text-slate-600">
        <dt>Taxes and fees</dt>
        <dd>
          {{
            offer.taxAmount
              ? formatMoney(offer.taxAmount, offer.taxCurrency ?? offer.totalCurrency)
              : 'Not itemised'
          }}
        </dd>
      </div>
      <div class="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
        <dt>Total</dt>
        <dd>{{ formatMoney(offer.totalAmount, offer.totalCurrency) }}</dd>
      </div>
    </dl>
    <p class="mt-2 text-xs text-slate-500">
      For {{ offer.passengers.map((p) => passengerTypeLabel(p.type, p.age)).join(', ') }}.
    </p>
  </div>
</template>
