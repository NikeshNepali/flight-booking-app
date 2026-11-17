<script setup lang="ts">
import { Check } from 'lucide-vue-next';

defineProps<{ current: 1 | 2 | 3 }>();
const steps = ['Flight', 'Passengers', 'Review & book'];
</script>

<template>
  <nav aria-label="Booking progress" class="mb-6">
    <ol class="flex items-center gap-2 text-sm">
      <li
        v-for="(step, i) in steps"
        :key="step"
        class="flex items-center gap-2"
        :aria-current="i + 1 === current ? 'step' : undefined"
      >
        <span
          class="grid size-6 place-items-center rounded-full text-xs font-semibold"
          :class="
            i + 1 < current
              ? 'bg-primary-600 text-white'
              : i + 1 === current
                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-600'
                : 'bg-slate-100 text-slate-500'
          "
        >
          <Check v-if="i + 1 < current" class="size-3.5" aria-hidden="true" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span
          :class="i + 1 === current ? 'font-medium text-slate-900' : 'text-slate-500'"
          class="hidden sm:inline"
          >{{ step }}</span
        >
        <span
          v-if="i < steps.length - 1"
          class="mx-1 h-px w-6 bg-slate-300 sm:w-10"
          aria-hidden="true"
        />
      </li>
    </ol>
  </nav>
</template>
