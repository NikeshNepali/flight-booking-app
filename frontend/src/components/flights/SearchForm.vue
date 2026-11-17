<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftRight, Search } from 'lucide-vue-next';
import AirportAutocomplete, {
  type SelectedPlace,
} from '@/components/common/AirportAutocomplete.vue';
import PassengerSelector from '@/components/common/PassengerSelector.vue';
import type { CabinClass, SearchParams } from '@/types';
import { addDaysLocal, todayLocal } from '@/utils/dates';
import { cabinLabels } from '@/utils/format';
import { toQuery } from '@/utils/searchQuery';

const props = defineProps<{ initial?: SearchParams | null; compact?: boolean }>();
const router = useRouter();

const tripType = ref<'round' | 'oneway'>(
  props.initial && !props.initial.returnDate ? 'oneway' : 'round',
);
const origin = ref<SelectedPlace | null>(
  props.initial
    ? { iataCode: props.initial.origin, label: props.initial.originLabel ?? props.initial.origin }
    : null,
);
const destination = ref<SelectedPlace | null>(
  props.initial
    ? {
        iataCode: props.initial.destination,
        label: props.initial.destinationLabel ?? props.initial.destination,
      }
    : null,
);
const form = reactive({
  departureDate: props.initial?.departureDate ?? addDaysLocal(todayLocal(), 14),
  returnDate: props.initial?.returnDate ?? addDaysLocal(todayLocal(), 21),
  adults: props.initial?.adults ?? 1,
  childAges: props.initial?.childAges ?? ([] as number[]),
  infantAges: props.initial?.infantAges ?? ([] as number[]),
  cabinClass: (props.initial?.cabinClass ?? 'economy') as CabinClass,
});
const errors = reactive<Record<string, string>>({});
const minDate = todayLocal();
const maxDate = addDaysLocal(minDate, 360);

function swap() {
  [origin.value, destination.value] = [destination.value, origin.value];
}

function validate(): boolean {
  for (const key of Object.keys(errors)) delete errors[key];
  if (!origin.value) errors.origin = 'Choose a departure airport from the list';
  if (!destination.value) errors.destination = 'Choose a destination from the list';
  if (origin.value && destination.value && origin.value.iataCode === destination.value.iataCode) {
    errors.destination = 'Destination must be different from departure';
  }
  if (!form.departureDate) errors.departureDate = 'Choose a departure date';
  else if (form.departureDate < minDate)
    errors.departureDate = 'Departure date cannot be in the past';
  else if (form.departureDate > maxDate)
    errors.departureDate = 'Choose a date within the next year';
  if (tripType.value === 'round') {
    if (!form.returnDate) errors.returnDate = 'Choose a return date';
    else if (form.returnDate < form.departureDate)
      errors.returnDate = 'Return must be on or after departure';
  }
  if (form.infantAges.length > form.adults)
    errors.passengers = 'Each infant must travel with an adult';
  return Object.keys(errors).length === 0;
}

function submit() {
  if (!validate()) return;
  const params: SearchParams = {
    origin: origin.value!.iataCode,
    originLabel: origin.value!.label,
    destination: destination.value!.iataCode,
    destinationLabel: destination.value!.label,
    departureDate: form.departureDate,
    returnDate: tripType.value === 'round' ? form.returnDate : undefined,
    adults: form.adults,
    childAges: form.childAges,
    infantAges: form.infantAges,
    cabinClass: form.cabinClass,
  };
  router.push({ name: 'results', query: toQuery(params) });
}
</script>

<template>
  <form
    class="card p-4 sm:p-6"
    :class="compact ? 'shadow-none' : 'shadow-lg shadow-primary-900/5'"
    novalidate
    @submit.prevent="submit"
  >
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="inline-flex rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Trip type">
        <button
          v-for="option in [
            { v: 'round', l: 'Round trip' },
            { v: 'oneway', l: 'One way' },
          ] as const"
          :key="option.v"
          type="button"
          role="radio"
          :aria-checked="tripType === option.v"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            tripType === option.v
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          "
          @click="tripType = option.v"
        >
          {{ option.l }}
        </button>
      </div>
      <label class="sr-only" for="cabin">Cabin class</label>
      <select
        id="cabin"
        v-model="form.cabinClass"
        class="rounded-xl border-0 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-100"
      >
        <option v-for="(label, value) in cabinLabels" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <div class="grid gap-3 lg:grid-cols-12">
      <div class="relative grid gap-3 sm:grid-cols-2 sm:gap-x-10 lg:col-span-5">
        <AirportAutocomplete
          id="origin"
          v-model="origin"
          label="From"
          variant="origin"
          :error="errors.origin"
        />
        <AirportAutocomplete
          id="destination"
          v-model="destination"
          label="To"
          variant="destination"
          :error="errors.destination"
        />
        <button
          type="button"
          class="absolute top-7 left-1/2 z-10 hidden size-8 -translate-x-1/2 place-items-center rounded-full border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 sm:grid"
          aria-label="Swap departure and destination"
          @click="swap"
        >
          <ArrowLeftRight class="size-4" aria-hidden="true" />
        </button>
      </div>
      <div class="grid grid-cols-2 gap-3 lg:col-span-4">
        <div>
          <label for="depart" class="field-label">Departure</label>
          <input
            id="depart"
            v-model="form.departureDate"
            type="date"
            class="field-input"
            :min="minDate"
            :max="maxDate"
            :aria-invalid="Boolean(errors.departureDate)"
          />
          <p v-if="errors.departureDate" class="field-error">{{ errors.departureDate }}</p>
        </div>
        <div>
          <label for="return" class="field-label">Return</label>
          <input
            id="return"
            v-model="form.returnDate"
            type="date"
            class="field-input disabled:bg-slate-50 disabled:text-slate-400"
            :min="form.departureDate || minDate"
            :max="maxDate"
            :disabled="tripType === 'oneway'"
            :aria-invalid="Boolean(errors.returnDate)"
          />
          <p v-if="errors.returnDate" class="field-error">{{ errors.returnDate }}</p>
        </div>
      </div>
      <div class="lg:col-span-3">
        <PassengerSelector
          v-model:adults="form.adults"
          v-model:child-ages="form.childAges"
          v-model:infant-ages="form.infantAges"
          :error="errors.passengers"
        />
      </div>
    </div>

    <div class="mt-5 flex justify-end">
      <button type="submit" class="btn-primary w-full px-6 py-3 text-base sm:w-auto">
        <Search class="size-5" aria-hidden="true" />Search flights
      </button>
    </div>
  </form>
</template>
