<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Minus, Plus, Users } from 'lucide-vue-next';

const MAX = 9;
const adults = defineModel<number>('adults', { required: true });
const childAges = defineModel<number[]>('childAges', { required: true });
const infantAges = defineModel<number[]>('infantAges', { required: true });
defineProps<{ error?: string }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const total = computed(() => adults.value + childAges.value.length + infantAges.value.length);
const summary = computed(() => {
  const parts = [`${adults.value} adult${adults.value > 1 ? 's' : ''}`];
  if (childAges.value.length)
    parts.push(`${childAges.value.length} child${childAges.value.length > 1 ? 'ren' : ''}`);
  if (infantAges.value.length)
    parts.push(`${infantAges.value.length} infant${infantAges.value.length > 1 ? 's' : ''}`);
  return parts.join(', ');
});

function changeAdults(delta: number) {
  const next = adults.value + delta;
  if (next < 1 || total.value + delta > MAX) return;
  adults.value = next;
  if (infantAges.value.length > next) infantAges.value = infantAges.value.slice(0, next);
}
function changeChildren(delta: number) {
  if (delta > 0 && total.value < MAX) childAges.value = [...childAges.value, 8];
  if (delta < 0) childAges.value = childAges.value.slice(0, -1);
}
function changeInfants(delta: number) {
  if (delta > 0 && total.value < MAX && infantAges.value.length < adults.value)
    infantAges.value = [...infantAges.value, 0];
  if (delta < 0) infantAges.value = infantAges.value.slice(0, -1);
}
function setAge(list: 'child' | 'infant', index: number, value: string) {
  const target = list === 'child' ? childAges : infantAges;
  target.value = target.value.map((age, i) => (i === index ? Number(value) : age));
}

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

const rows = computed(() => [
  {
    key: 'adults',
    label: 'Adults',
    hint: '18+',
    count: adults.value,
    change: changeAdults,
    canDec: adults.value > 1,
    canInc: total.value < MAX,
  },
  {
    key: 'children',
    label: 'Children',
    hint: '2–17',
    count: childAges.value.length,
    change: changeChildren,
    canDec: childAges.value.length > 0,
    canInc: total.value < MAX,
  },
  {
    key: 'infants',
    label: 'Infants',
    hint: 'Under 2, on lap',
    count: infantAges.value.length,
    change: changeInfants,
    canDec: infantAges.value.length > 0,
    canInc: total.value < MAX && infantAges.value.length < adults.value,
  },
]);
</script>

<template>
  <div ref="root" class="relative">
    <span id="passengers-label" class="field-label">Passengers</span>
    <button
      type="button"
      class="field-input flex items-center gap-2 text-left"
      aria-labelledby="passengers-label"
      :aria-expanded="open"
      aria-controls="passenger-panel"
      :aria-invalid="Boolean(error)"
      @click="open = !open"
    >
      <Users class="size-4 text-slate-400" aria-hidden="true" />
      <span class="truncate">{{ summary }}</span>
    </button>
    <p v-if="error" class="field-error">{{ error }}</p>

    <div
      v-if="open"
      id="passenger-panel"
      class="absolute right-0 z-20 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
      @keydown.esc="open = false"
    >
      <div v-for="row in rows" :key="row.key" class="flex items-center justify-between py-2">
        <div>
          <p class="text-sm font-medium">{{ row.label }}</p>
          <p class="text-xs text-slate-500">{{ row.hint }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="grid size-8 place-items-center rounded-full border border-slate-300 disabled:opacity-40"
            :disabled="!row.canDec"
            :aria-label="`Remove one ${row.label.toLowerCase()}`"
            @click="row.change(-1)"
          >
            <Minus class="size-4" aria-hidden="true" />
          </button>
          <span class="w-4 text-center text-sm font-semibold" aria-live="polite">{{
            row.count
          }}</span>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-full border border-slate-300 disabled:opacity-40"
            :disabled="!row.canInc"
            :aria-label="`Add one ${row.label.toLowerCase()}`"
            @click="row.change(1)"
          >
            <Plus class="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div v-if="childAges.length || infantAges.length" class="mt-2 border-t border-slate-100 pt-3">
        <p class="mb-2 text-xs text-slate-500">Age on the day of travel (airlines price by age).</p>
        <div class="grid grid-cols-2 gap-2">
          <label v-for="(age, i) in childAges" :key="`c${i}`" class="text-xs text-slate-600">
            Child {{ i + 1 }}
            <select
              class="field-input mt-1 py-1.5"
              :value="age"
              @change="setAge('child', i, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="n in 16" :key="n" :value="n + 1">{{ n + 1 }} years</option>
            </select>
          </label>
          <label v-for="(age, i) in infantAges" :key="`i${i}`" class="text-xs text-slate-600">
            Infant {{ i + 1 }}
            <select
              class="field-input mt-1 py-1.5"
              :value="age"
              @change="setAge('infant', i, ($event.target as HTMLSelectElement).value)"
            >
              <option :value="0">Under 1</option>
              <option :value="1">1 year</option>
            </select>
          </label>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-500">
        Up to {{ MAX }} passengers. Each infant travels on an adult's lap.
      </p>
      <button type="button" class="btn-primary mt-3 w-full" @click="open = false">Done</button>
    </div>
  </div>
</template>
