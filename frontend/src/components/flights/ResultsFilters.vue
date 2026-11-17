<script setup lang="ts">
import { computed } from 'vue';
import type { FlightOffer } from '@/types';
import { airlineOptions, type OfferFilters } from '@/utils/offers';
import { formatMoney } from '@/utils/format';

const props = defineProps<{ offers: FlightOffer[] }>();
const filters = defineModel<OfferFilters>({ required: true });

const airlines = computed(() => airlineOptions(props.offers));
const currency = computed(() => props.offers[0]?.totalCurrency ?? 'USD');
const priceBounds = computed(() => {
  const prices = props.offers.map((o) => Number(o.totalAmount));
  return prices.length
    ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
    : { min: 0, max: 0 };
});
const stopsOptions = [
  { value: null, label: 'Any number of stops' },
  { value: 0, label: 'Nonstop only' },
  { value: 1, label: '1 stop or fewer' },
  { value: 2, label: '2 stops or fewer' },
] as const;

function toggleAirline(name: string) {
  const current = filters.value.airlines;
  filters.value = {
    ...filters.value,
    airlines: current.includes(name) ? current.filter((a) => a !== name) : [...current, name],
  };
}
function setMaxPrice(value: string) {
  const n = Number(value);
  filters.value = { ...filters.value, maxPrice: n >= priceBounds.value.max ? null : n };
}
function reset() {
  filters.value = { airlines: [], maxStops: null, maxPrice: null };
}
</script>

<template>
  <aside class="card space-y-6 p-5" aria-label="Filters">
    <div class="flex items-center justify-between">
      <h2 class="font-semibold">Filters</h2>
      <button
        type="button"
        class="text-sm font-medium text-primary-700 hover:underline"
        @click="reset"
      >
        Reset
      </button>
    </div>

    <fieldset>
      <legend class="mb-2 text-sm font-medium text-slate-700">Stops</legend>
      <label
        v-for="option in stopsOptions"
        :key="String(option.value)"
        class="flex cursor-pointer items-center gap-2 py-1 text-sm"
      >
        <input
          type="radio"
          name="stops"
          class="size-4 accent-primary-600"
          :checked="filters.maxStops === option.value"
          @change="filters = { ...filters, maxStops: option.value }"
        />
        {{ option.label }}
      </label>
    </fieldset>

    <div v-if="priceBounds.max > priceBounds.min">
      <label for="max-price" class="mb-2 flex justify-between text-sm font-medium text-slate-700">
        <span>Maximum price</span>
        <span class="text-primary-700">{{
          filters.maxPrice === null ? 'Any' : formatMoney(filters.maxPrice, currency)
        }}</span>
      </label>
      <input
        id="max-price"
        type="range"
        class="w-full accent-primary-600"
        :min="priceBounds.min"
        :max="priceBounds.max"
        :step="Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50))"
        :value="filters.maxPrice ?? priceBounds.max"
        @input="setMaxPrice(($event.target as HTMLInputElement).value)"
      />
    </div>

    <fieldset v-if="airlines.length">
      <legend class="mb-2 text-sm font-medium text-slate-700">Airlines</legend>
      <label
        v-for="airline in airlines"
        :key="airline.name"
        class="flex cursor-pointer items-center gap-2 py-1 text-sm"
      >
        <input
          type="checkbox"
          class="size-4 rounded accent-primary-600"
          :checked="filters.airlines.includes(airline.name)"
          @change="toggleAirline(airline.name)"
        />
        <span class="flex-1 truncate">{{ airline.name }}</span>
        <span class="text-xs text-slate-500"
          >from {{ formatMoney(airline.minPrice, airline.currency) }}</span
        >
      </label>
    </fieldset>
    <p class="text-xs text-slate-500">Filters apply to the offers loaded so far.</p>
  </aside>
</template>
