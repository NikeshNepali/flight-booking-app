<script setup lang="ts">
import { ref } from 'vue';
import { Plane } from 'lucide-vue-next';
import type { Carrier } from '@/types';

withDefaults(defineProps<{ carrier: Carrier; size?: 'sm' | 'md' }>(), { size: 'md' });
const failed = ref(false);
</script>

<template>
  <span
    class="grid shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white"
    :class="size === 'sm' ? 'size-7' : 'size-10'"
  >
    <img
      v-if="carrier.logoUrl && !failed"
      :src="carrier.logoUrl"
      :alt="`${carrier.name} logo`"
      class="size-full object-contain p-1"
      loading="lazy"
      @error="failed = true"
    />
    <Plane v-else class="size-4 text-slate-400" :aria-label="carrier.name" />
  </span>
</template>
