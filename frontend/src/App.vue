<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { FlaskConical, TriangleAlert } from 'lucide-vue-next';
import AppHeader from '@/components/common/AppHeader.vue';
import { getHealth } from '@/services/flights';
import type { HealthInfo } from '@/types';

const health = ref<HealthInfo | null>(null);

onMounted(async () => {
  try {
    health.value = await getHealth();
  } catch {
    health.value = null; // pages show their own errors when the API is unreachable
  }
});
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
    >
      Skip to content
    </a>
    <AppHeader />

    <div
      v-if="health && !health.provider.configured"
      class="border-b border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800"
      role="alert"
    >
      <TriangleAlert class="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
      The flight provider is not configured. Set <code>DUFFEL_ACCESS_TOKEN</code> in
      <code>backend/.env</code> (locally) or in your hosting environment variables.
    </div>
    <div
      v-else-if="health?.provider.mode === 'test'"
      class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900 sm:text-sm"
      role="status"
    >
      <FlaskConical class="mr-1 inline size-4 align-text-bottom" aria-hidden="true" />
      <strong>Test mode.</strong> Results and bookings use the Duffel test environment — no real
      tickets are issued and no money is charged.
    </div>

    <main id="main" class="flex-1">
      <RouterView />
    </main>

    <footer class="border-t border-slate-200 py-8 text-center text-xs text-slate-500">
      <p>
        Flight offers are provided by Duffel and the airlines it connects to. Not every airline or
        route is available.
      </p>
      <p class="mt-1">© {{ new Date().getFullYear() }} SkyRoute</p>
    </footer>
  </div>
</template>
