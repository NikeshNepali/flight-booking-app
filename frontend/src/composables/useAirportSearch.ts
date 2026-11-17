import { ref, watch, type Ref } from 'vue';
import { ApiError } from '@/services/api';
import { searchAirports } from '@/services/flights';
import type { Place } from '@/types';

/** Debounced airport/city suggestions with request cancellation. */
export function useAirportSearch(query: Ref<string>, delayMs = 250) {
  const results = ref<Place[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  watch(query, (value) => {
    clearTimeout(timer);
    controller?.abort();
    error.value = null;
    if (value.trim().length < 2) {
      results.value = [];
      loading.value = false;
      return;
    }
    loading.value = true;
    timer = setTimeout(async () => {
      controller = new AbortController();
      try {
        results.value = await searchAirports(value.trim(), controller.signal);
      } catch (e) {
        if (controller.signal.aborted) return;
        results.value = [];
        error.value = e instanceof ApiError ? e.message : 'Could not load airports';
      } finally {
        if (!controller.signal.aborted) loading.value = false;
      }
    }, delayMs);
  });

  return { results, loading, error };
}
