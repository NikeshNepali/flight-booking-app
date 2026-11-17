<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronDown, PlaneTakeoff, SearchX, SlidersHorizontal } from 'lucide-vue-next';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorState from '@/components/common/ErrorState.vue';
import FlightCard from '@/components/flights/FlightCard.vue';
import FlightCardSkeleton from '@/components/flights/FlightCardSkeleton.vue';
import ResultsFilters from '@/components/flights/ResultsFilters.vue';
import SearchForm from '@/components/flights/SearchForm.vue';
import { ApiError } from '@/services/api';
import { loadMoreOffers, searchFlights } from '@/services/flights';
import type { FlightOffer, SearchParams } from '@/types';
import { cabinLabels, formatLocalDate } from '@/utils/format';
import {
  filterOffers,
  sortOffers,
  totalDuration,
  type OfferFilters,
  type SortKey,
} from '@/utils/offers';
import { fromQuery } from '@/utils/searchQuery';

const route = useRoute();
const router = useRouter();

const params = ref<SearchParams | null>(null);
const offers = ref<FlightOffer[]>([]);
const offerRequestId = ref<string | null>(null);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref<ApiError | null>(null);
const loadMoreError = ref<string | null>(null);
const editing = ref(false);
const showFilters = ref(false);
const sort = ref<SortKey>('cheapest');
const filters = ref<OfferFilters>({ airlines: [], maxStops: null, maxPrice: null });
let searchId = 0;

async function runSearch() {
  if (route.name !== 'results') return; // navigating away
  const current = fromQuery(route.query);
  params.value = current;
  editing.value = false;
  if (!current) return;
  const id = ++searchId;
  loading.value = true;
  error.value = null;
  offers.value = [];
  filters.value = { airlines: [], maxStops: null, maxPrice: null };
  try {
    const page = await searchFlights(current);
    if (id !== searchId) return; // a newer search started meanwhile
    offers.value = page.offers;
    offerRequestId.value = page.offerRequestId;
    nextCursor.value = page.nextCursor;
  } catch (e) {
    if (id === searchId)
      error.value = e instanceof ApiError ? e : new ApiError('Search failed.', 'UNKNOWN', 0);
  } finally {
    if (id === searchId) loading.value = false;
  }
}

async function loadMore() {
  if (!offerRequestId.value || !nextCursor.value) return;
  loadingMore.value = true;
  loadMoreError.value = null;
  try {
    const page = await loadMoreOffers(offerRequestId.value, nextCursor.value);
    const known = new Set(offers.value.map((o) => o.id));
    offers.value = [...offers.value, ...page.offers.filter((o) => !known.has(o.id))];
    nextCursor.value = page.nextCursor;
  } catch (e) {
    loadMoreError.value = e instanceof ApiError ? e.message : 'Could not load more flights.';
  } finally {
    loadingMore.value = false;
  }
}

watch(() => route.fullPath, runSearch, { immediate: true });

const visibleOffers = computed(() =>
  sortOffers(filterOffers(offers.value, filters.value), sort.value),
);
const cheapestId = computed(() => sortOffers(offers.value, 'cheapest')[0]?.id);
const fastestId = computed(() => {
  const fastest = sortOffers(offers.value, 'fastest')[0];
  return fastest && totalDuration(fastest) > 0 ? fastest.id : undefined;
});
const activeFilterCount = computed(
  () =>
    filters.value.airlines.length +
    (filters.value.maxStops !== null ? 1 : 0) +
    (filters.value.maxPrice !== null ? 1 : 0),
);
const passengerCount = computed(() =>
  params.value
    ? params.value.adults + params.value.childAges.length + params.value.infantAges.length
    : 0,
);

function badgeFor(offer: FlightOffer) {
  if (offer.id === cheapestId.value) return 'Cheapest';
  if (offer.id === fastestId.value) return 'Fastest';
  return undefined;
}

function select(offer: FlightOffer) {
  router.push({
    name: 'flight-details',
    params: { offerId: offer.id },
    query: { p: offer.totalAmount, c: offer.totalCurrency },
  });
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6">
    <!-- Search summary -->
    <div v-if="params" class="mb-6">
      <div v-if="!editing" class="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h1 class="text-lg font-semibold">
            {{ params.originLabel ?? params.origin }} →
            {{ params.destinationLabel ?? params.destination }}
          </h1>
          <p class="text-sm text-slate-600">
            {{ formatLocalDate(params.departureDate)
            }}<template v-if="params.returnDate">
              – {{ formatLocalDate(params.returnDate) }}</template
            >
            · {{ passengerCount }} passenger{{ passengerCount > 1 ? 's' : '' }} ·
            {{ cabinLabels[params.cabinClass] }}
          </p>
        </div>
        <button type="button" class="btn-secondary" @click="editing = true">Modify search</button>
      </div>
      <SearchForm v-else :key="route.fullPath" :initial="params" compact />
    </div>

    <ErrorState
      v-if="!params"
      title="Missing search details"
      message="Start a new search to see flights."
    >
      <RouterLink to="/" class="btn-primary">New search</RouterLink>
    </ErrorState>

    <template v-else>
      <!-- Loading -->
      <div v-if="loading" aria-busy="true" aria-live="polite">
        <p class="mb-4 text-sm text-slate-600">
          Searching airlines for the best offers… this can take up to 30 seconds.
        </p>
        <div class="space-y-3">
          <FlightCardSkeleton v-for="n in 5" :key="n" />
        </div>
      </div>

      <!-- Error -->
      <ErrorState
        v-else-if="error"
        :title="
          error.code === 'CONFIG_ERROR'
            ? 'Flight search is not configured'
            : error.code === 'VALIDATION_ERROR'
              ? 'Please check your search'
              : 'We could not complete your search'
        "
        :message="
          error.fieldErrors.length
            ? error.fieldErrors.map((f) => f.message).join('. ')
            : error.message
        "
        :retry-label="
          error.code === 'VALIDATION_ERROR' || error.code === 'CONFIG_ERROR'
            ? undefined
            : 'Try again'
        "
        @retry="runSearch"
      >
        <button type="button" class="btn-secondary" @click="editing = true">Modify search</button>
      </ErrorState>

      <!-- No results -->
      <EmptyState
        v-else-if="offers.length === 0"
        :icon="SearchX"
        title="No flights found"
        message="No airline returned offers for this route and date. Try different dates, nearby airports or another cabin class."
      >
        <button type="button" class="btn-primary" @click="editing = true">Modify search</button>
      </EmptyState>

      <!-- Results -->
      <div v-else class="grid gap-6 lg:grid-cols-[17rem_1fr]">
        <div class="lg:hidden">
          <button
            type="button"
            class="btn-secondary w-full"
            :aria-expanded="showFilters"
            @click="showFilters = !showFilters"
          >
            <SlidersHorizontal class="size-4" aria-hidden="true" />Filters<span
              v-if="activeFilterCount"
            >
              ({{ activeFilterCount }})</span
            >
          </button>
        </div>
        <div :class="showFilters ? 'block' : 'hidden lg:block'">
          <ResultsFilters v-model="filters" :offers="offers" />
        </div>

        <div>
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p class="text-sm text-slate-600" aria-live="polite">
              Showing <strong>{{ visibleOffers.length }}</strong> of {{ offers.length }} offers{{
                nextCursor ? ' loaded' : ''
              }}
            </p>
            <div
              class="inline-flex rounded-xl bg-slate-100 p-1"
              role="radiogroup"
              aria-label="Sort by"
            >
              <button
                v-for="option in [
                  { v: 'cheapest', l: 'Cheapest' },
                  { v: 'fastest', l: 'Fastest' },
                  { v: 'earliest', l: 'Earliest' },
                ] as const"
                :key="option.v"
                type="button"
                role="radio"
                :aria-checked="sort === option.v"
                class="rounded-lg px-3 py-1.5 text-sm font-medium"
                :class="
                  sort === option.v
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                "
                @click="sort = option.v"
              >
                {{ option.l }}
              </button>
            </div>
          </div>

          <EmptyState
            v-if="visibleOffers.length === 0"
            :icon="PlaneTakeoff"
            title="No flights match your filters"
            message="Try removing some filters to see more options."
          >
            <button
              type="button"
              class="btn-secondary"
              @click="filters = { airlines: [], maxStops: null, maxPrice: null }"
            >
              Clear filters
            </button>
          </EmptyState>

          <ul v-else class="space-y-3">
            <li v-for="offer in visibleOffers" :key="offer.id">
              <FlightCard :offer="offer" :badge="badgeFor(offer)" @select="select" />
            </li>
          </ul>

          <div v-if="nextCursor" class="mt-6 text-center">
            <button type="button" class="btn-secondary" :disabled="loadingMore" @click="loadMore">
              <ChevronDown class="size-4" aria-hidden="true" />{{
                loadingMore ? 'Loading…' : 'Load more flights'
              }}
            </button>
            <p v-if="loadMoreError" class="mt-2 text-sm text-red-600" role="alert">
              {{ loadMoreError }}
            </p>
          </div>
          <p class="mt-6 text-center text-xs text-slate-500">
            Prices are totals for all passengers including taxes, and are confirmed again before you
            book.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
