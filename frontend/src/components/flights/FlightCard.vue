<script setup lang="ts">
import { computed } from 'vue';
import { Briefcase, Luggage } from 'lucide-vue-next';
import AirlineLogo from '@/components/common/AirlineLogo.vue';
import SliceSummary from './SliceSummary.vue';
import type { FlightOffer } from '@/types';
import { baggageSummary, cabinLabels, formatMoney } from '@/utils/format';

const props = defineProps<{ offer: FlightOffer; badge?: string }>();
defineEmits<{ select: [offer: FlightOffer] }>();

const firstSegment = computed(() => props.offer.slices[0]?.segments[0]);
const cabin = computed(
  () =>
    firstSegment.value?.cabinMarketingName ??
    (firstSegment.value?.cabinClass ? cabinLabels[firstSegment.value.cabinClass] : null),
);
const operatedBy = computed(() => {
  const names = new Set(
    props.offer.slices.flatMap((s) => s.segments.map((seg) => seg.operatingCarrier.name)),
  );
  names.delete(props.offer.owner.name);
  return [...names];
});
const fareBrand = computed(() => props.offer.slices[0]?.fareBrandName);
const passengerCount = computed(() => props.offer.passengers.length);
</script>

<template>
  <article
    class="card p-4 transition-shadow hover:shadow-md sm:p-5"
    :aria-label="`${offer.owner.name}, ${formatMoney(offer.totalAmount, offer.totalCurrency)}`"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-stretch">
      <div class="flex-1 space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <AirlineLogo :carrier="offer.owner" size="sm" />
          <span class="text-sm font-medium">{{ offer.owner.name }}</span>
          <span
            v-if="badge"
            class="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
            >{{ badge }}</span
          >
          <span
            v-if="fareBrand"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >{{ fareBrand }}</span
          >
        </div>
        <SliceSummary v-for="slice in offer.slices" :key="slice.id" :slice="slice" />
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          <span v-if="cabin">{{ cabin }}</span>
          <span class="inline-flex items-center gap-1">
            <Luggage class="size-3.5" aria-hidden="true" />{{
              baggageSummary(firstSegment?.baggage)
            }}
          </span>
          <span v-if="operatedBy.length" class="inline-flex items-center gap-1">
            <Briefcase class="size-3.5" aria-hidden="true" />Operated by {{ operatedBy.join(', ') }}
          </span>
        </div>
      </div>
      <div
        class="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 md:w-44 md:flex-col md:items-end md:justify-center md:border-t-0 md:border-l md:pt-0 md:pl-5"
      >
        <div class="md:text-right">
          <p class="text-2xl font-bold text-slate-900">
            {{ formatMoney(offer.totalAmount, offer.totalCurrency) }}
          </p>
          <p class="text-xs text-slate-500">
            total{{ passengerCount > 1 ? ` · ${passengerCount} passengers` : '' }}, incl. taxes
          </p>
        </div>
        <button type="button" class="btn-primary md:w-full" @click="$emit('select', offer)">
          Select flight
        </button>
      </div>
    </div>
  </article>
</template>
