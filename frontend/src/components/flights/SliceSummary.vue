<script setup lang="ts">
import type { Slice } from '@/types';
import {
  dayOffset,
  formatDuration,
  formatLocalTime,
  stopsLabel,
  timeZoneLabel,
} from '@/utils/format';

defineProps<{ slice: Slice }>();
</script>

<template>
  <div class="flex items-center gap-3 sm:gap-5">
    <div class="w-20 text-left">
      <p class="text-lg font-semibold tabular-nums">{{ formatLocalTime(slice.departingAt) }}</p>
      <p class="text-xs text-slate-500">
        {{ slice.origin.iataCode }}
        <span class="text-slate-400">{{
          timeZoneLabel(slice.departingAt, slice.origin.timeZone)
        }}</span>
      </p>
    </div>
    <div class="flex flex-1 flex-col items-center text-center">
      <p class="text-xs text-slate-500">{{ formatDuration(slice.durationMinutes) }}</p>
      <div class="relative my-1 h-px w-full bg-slate-300">
        <span
          v-for="(c, i) in slice.connections"
          :key="i"
          class="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400"
          :style="{ left: `${((i + 1) / (slice.connections.length + 1)) * 100}%` }"
        />
      </div>
      <p
        class="text-xs"
        :class="slice.stops === 0 ? 'font-medium text-emerald-700' : 'text-slate-600'"
      >
        {{ stopsLabel(slice.stops) }}
        <span v-if="slice.connections.length" class="text-slate-400"
          >· {{ slice.connections.map((c) => c.airport.iataCode).join(', ') }}</span
        >
      </p>
    </div>
    <div class="w-20 text-right">
      <p class="text-lg font-semibold tabular-nums">
        {{ formatLocalTime(slice.arrivingAt)
        }}<sup
          v-if="dayOffset(slice.departingAt, slice.arrivingAt) > 0"
          class="ml-0.5 text-xs font-medium text-amber-600"
          >+{{ dayOffset(slice.departingAt, slice.arrivingAt) }}</sup
        >
      </p>
      <p class="text-xs text-slate-500">
        {{ slice.destination.iataCode }}
        <span class="text-slate-400">{{
          timeZoneLabel(slice.arrivingAt, slice.destination.timeZone)
        }}</span>
      </p>
    </div>
  </div>
</template>
