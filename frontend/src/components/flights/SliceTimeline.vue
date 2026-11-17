<script setup lang="ts">
import { Clock, Luggage, Plane } from 'lucide-vue-next';
import AirlineLogo from '@/components/common/AirlineLogo.vue';
import type { Slice } from '@/types';
import {
  baggageSummary,
  cabinLabels,
  formatDuration,
  formatLocalDate,
  formatLocalTime,
  stopsLabel,
  timeZoneLabel,
} from '@/utils/format';

defineProps<{ slice: Slice; title: string }>();
</script>

<template>
  <section class="card p-5">
    <header class="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h3 class="text-base font-semibold">
          {{ title }}: {{ slice.origin.cityName ?? slice.origin.iataCode }} →
          {{ slice.destination.cityName ?? slice.destination.iataCode }}
        </h3>
        <p class="text-sm text-slate-500">
          {{ formatLocalDate(slice.departingAt, { weekday: 'long', year: 'numeric' }) }} ·
          {{ formatDuration(slice.durationMinutes) }} · {{ stopsLabel(slice.stops) }}
        </p>
      </div>
      <span
        v-if="slice.fareBrandName"
        class="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
        >{{ slice.fareBrandName }}</span
      >
    </header>

    <ol class="space-y-0">
      <template v-for="(segment, index) in slice.segments" :key="segment.id">
        <li class="relative grid grid-cols-[4.5rem_1fr] gap-x-3">
          <div class="text-right">
            <p class="font-semibold tabular-nums">{{ formatLocalTime(segment.departingAt) }}</p>
            <p class="text-xs text-slate-400">
              {{ timeZoneLabel(segment.departingAt, segment.origin.timeZone) }}
            </p>
          </div>
          <div class="relative border-l-2 border-primary-200 pb-4 pl-4">
            <span
              class="absolute top-1.5 -left-[7px] size-3 rounded-full border-2 border-primary-600 bg-white"
            />
            <p class="font-medium">{{ segment.origin.name }} ({{ segment.origin.iataCode }})</p>
            <p class="text-xs text-slate-500">{{ formatLocalDate(segment.departingAt) }}</p>
            <div class="my-3 rounded-xl bg-slate-50 p-3 text-sm">
              <div class="flex flex-wrap items-center gap-2">
                <AirlineLogo :carrier="segment.marketingCarrier" size="sm" />
                <span class="font-medium"
                  >{{ segment.marketingCarrier.name }} {{ segment.flightNumber }}</span
                >
                <span class="inline-flex items-center gap-1 text-slate-500"
                  ><Clock class="size-3.5" aria-hidden="true" />{{
                    formatDuration(segment.durationMinutes)
                  }}</span
                >
              </div>
              <ul class="mt-2 space-y-0.5 text-xs text-slate-600">
                <li v-if="segment.operatingCarrier.name !== segment.marketingCarrier.name">
                  Operated by <strong>{{ segment.operatingCarrier.name }}</strong>
                </li>
                <li>
                  {{
                    segment.cabinMarketingName ??
                    (segment.cabinClass ? cabinLabels[segment.cabinClass] : 'Cabin not specified')
                  }}
                  <span v-if="segment.aircraft"> · {{ segment.aircraft }}</span>
                </li>
                <li class="inline-flex items-center gap-1">
                  <Luggage class="size-3.5" aria-hidden="true" />{{
                    baggageSummary(segment.baggage)
                  }}
                </li>
              </ul>
            </div>
          </div>
        </li>
        <li class="relative grid grid-cols-[4.5rem_1fr] gap-x-3">
          <div class="text-right">
            <p class="font-semibold tabular-nums">{{ formatLocalTime(segment.arrivingAt) }}</p>
            <p class="text-xs text-slate-400">
              {{ timeZoneLabel(segment.arrivingAt, segment.destination.timeZone) }}
            </p>
          </div>
          <div
            class="relative pb-2 pl-4"
            :class="
              index < slice.segments.length - 1 ? 'border-l-2 border-dashed border-amber-300' : ''
            "
          >
            <span class="absolute top-1.5 -left-[5px] size-3 rounded-full bg-primary-600" />
            <p class="font-medium">
              {{ segment.destination.name }} ({{ segment.destination.iataCode }})
            </p>
            <p class="text-xs text-slate-500">{{ formatLocalDate(segment.arrivingAt) }}</p>
          </div>
        </li>
        <li v-if="slice.connections[index]" class="grid grid-cols-[4.5rem_1fr] gap-x-3">
          <div />
          <div class="border-l-2 border-dashed border-amber-300 py-2 pl-4">
            <p
              class="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
            >
              <Plane class="size-3.5" aria-hidden="true" />
              {{ formatDuration(slice.connections[index]!.durationMinutes) }} connection in
              {{
                slice.connections[index]!.airport.cityName ?? slice.connections[index]!.airport.name
              }}
              <span v-if="slice.connections[index]!.durationMinutes < 60">· short connection</span>
            </p>
          </div>
        </li>
      </template>
    </ol>
  </section>
</template>
