<script setup lang="ts">
import { computed } from 'vue';
import { CircleCheck, CircleHelp, CircleX } from 'lucide-vue-next';
import type { Condition, FareConditions } from '@/types';
import { conditionLabel } from '@/utils/format';

const props = defineProps<{ conditions: FareConditions }>();

const rows = computed(() => [
  {
    key: 'refund',
    condition: props.conditions.refundBeforeDeparture,
    label: conditionLabel(props.conditions.refundBeforeDeparture, 'Refunds'),
  },
  {
    key: 'change',
    condition: props.conditions.changeBeforeDeparture,
    label: conditionLabel(props.conditions.changeBeforeDeparture, 'Changes'),
  },
]);

function icon(condition: Condition | null) {
  if (!condition) return CircleHelp;
  return condition.allowed ? CircleCheck : CircleX;
}
</script>

<template>
  <div>
    <h3 class="mb-2 text-sm font-semibold">Fare conditions (before departure)</h3>
    <ul class="space-y-1.5 text-sm">
      <li v-for="row in rows" :key="row.key" class="flex items-start gap-2">
        <component
          :is="icon(row.condition)"
          class="mt-0.5 size-4 shrink-0"
          :class="
            !row.condition
              ? 'text-slate-400'
              : row.condition.allowed
                ? 'text-emerald-600'
                : 'text-red-500'
          "
          aria-hidden="true"
        />
        <span>{{ row.label }}</span>
      </li>
    </ul>
    <p class="mt-2 text-xs text-slate-500">
      Conditions are set by the airline. Fare differences may also apply when changing.
    </p>
  </div>
</template>
