<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Building2, Loader2, MapPin, PlaneTakeoff, PlaneLanding } from 'lucide-vue-next';
import { useAirportSearch } from '@/composables/useAirportSearch';
import type { Place } from '@/types';

export interface SelectedPlace {
  iataCode: string;
  label: string;
}

const props = defineProps<{
  id: string;
  label: string;
  placeholder?: string;
  error?: string;
  variant: 'origin' | 'destination';
}>();
const model = defineModel<SelectedPlace | null>({ required: true });

const text = ref(model.value?.label ?? '');
const open = ref(false);
const activeIndex = ref(-1);
const { results, loading, error: searchError } = useAirportSearch(text);

// Flatten cities and their airports into one keyboard-navigable list.
const options = computed(() => {
  const list: { place: Place; nested: boolean }[] = [];
  for (const place of results.value) {
    list.push({ place, nested: false });
    if (place.type === 'city') {
      for (const airport of place.airports ?? []) list.push({ place: airport, nested: true });
    }
  }
  return list.slice(0, 12);
});

watch(model, (value) => {
  if (value && value.label !== text.value) text.value = value.label;
});

function labelFor(place: Place) {
  return place.type === 'city'
    ? `${place.name} (all airports) · ${place.iataCode}`
    : `${place.cityName ? `${place.cityName} · ` : ''}${place.name} (${place.iataCode})`;
}

function onInput() {
  open.value = true;
  activeIndex.value = -1;
  if (model.value) model.value = null; // typing invalidates the previous selection
}

function choose(place: Place) {
  const label =
    place.type === 'city'
      ? `${place.name} (${place.iataCode})`
      : `${place.cityName ?? place.name} (${place.iataCode})`;
  model.value = { iataCode: place.iataCode, label };
  text.value = label;
  open.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value && ['ArrowDown', 'ArrowUp'].includes(event.key)) open.value = true;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, options.value.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (event.key === 'Enter' && open.value && options.value[activeIndex.value]) {
    event.preventDefault();
    choose(options.value[activeIndex.value]!.place);
  } else if (event.key === 'Escape') {
    open.value = false;
  }
}

function onBlur() {
  // Delay so a click on an option registers before the list closes.
  setTimeout(() => (open.value = false), 150);
}

const listId = computed(() => `${props.id}-listbox`);
const showList = computed(() => open.value && text.value.trim().length >= 2);
</script>

<template>
  <div class="relative">
    <label :for="id" class="field-label">{{ label }}</label>
    <div class="relative">
      <component
        :is="variant === 'origin' ? PlaneTakeoff : PlaneLanding"
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        :id="id"
        v-model="text"
        type="text"
        role="combobox"
        autocomplete="off"
        class="field-input pl-9"
        :placeholder="placeholder ?? 'City or airport'"
        :aria-expanded="showList"
        :aria-controls="listId"
        :aria-activedescendant="activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${id}-error` : undefined"
        @input="onInput"
        @focus="open = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <Loader2
        v-if="loading"
        class="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-slate-400"
        aria-hidden="true"
      />
    </div>
    <p v-if="error" :id="`${id}-error`" class="field-error">{{ error }}</p>

    <ul
      v-show="showList"
      :id="listId"
      role="listbox"
      class="absolute z-20 mt-1 max-h-80 w-full min-w-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
    >
      <li v-if="loading && options.length === 0" class="px-3 py-2 text-sm text-slate-500">
        Searching…
      </li>
      <li v-else-if="searchError" class="px-3 py-2 text-sm text-red-600">{{ searchError }}</li>
      <li v-else-if="!loading && options.length === 0" class="px-3 py-2 text-sm text-slate-500">
        No airports found
      </li>
      <li
        v-for="(option, index) in options"
        :id="`${id}-opt-${index}`"
        :key="`${option.place.type}-${option.place.iataCode}-${index}`"
        role="option"
        :aria-selected="index === activeIndex"
        class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm"
        :class="[
          index === activeIndex ? 'bg-primary-50' : 'hover:bg-slate-50',
          option.nested ? 'pl-8' : '',
        ]"
        @mousedown.prevent="choose(option.place)"
        @mouseenter="activeIndex = index"
      >
        <component
          :is="option.place.type === 'city' ? Building2 : MapPin"
          class="size-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <span class="flex-1 truncate">{{ labelFor(option.place) }}</span>
        <span v-if="option.place.countryCode" class="text-xs text-slate-400">{{
          option.place.countryCode
        }}</span>
      </li>
    </ul>
  </div>
</template>
