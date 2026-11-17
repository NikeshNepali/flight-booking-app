<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Timer } from 'lucide-vue-next';

const props = defineProps<{ expiresAt: string }>();
const emit = defineEmits<{ expired: [] }>();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

const remainingMs = computed(() => Date.parse(props.expiresAt) - now.value);
const label = computed(() => {
  const total = Math.max(0, Math.floor(remainingMs.value / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m >= 48 * 60) return `${Math.floor(m / 1440)} days`;
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s).padStart(2, '0')}`;
});

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
    if (remainingMs.value <= 0) {
      clearInterval(timer);
      emit('expired');
    }
  }, 1000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <p
    class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
    :class="remainingMs < 5 * 60_000 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'"
    role="timer"
  >
    <Timer class="size-3.5" aria-hidden="true" />
    <template v-if="remainingMs > 0">Offer valid for {{ label }}</template>
    <template v-else>Offer expired</template>
  </p>
</template>
