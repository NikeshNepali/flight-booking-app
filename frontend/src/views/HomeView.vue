<script setup lang="ts">
import { BadgeCheck, Globe2, ShieldCheck } from 'lucide-vue-next';
import SearchForm from '@/components/flights/SearchForm.vue';

const features = [
  {
    icon: Globe2,
    title: 'Many airlines, one search',
    text: 'Compare offers from the airlines available through our flight provider.',
  },
  {
    icon: BadgeCheck,
    title: 'Real airline bookings',
    text: 'Your booking is only confirmed once the airline creates it — no surprises.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    text: 'No account needed. Retrieve bookings with a private, unguessable code.',
  },
];
</script>

<template>
  <div>
    <section class="bg-gradient-to-b from-primary-50 to-white">
      <div class="mx-auto max-w-6xl px-4 pt-12 pb-10 sm:pt-20">
        <h1 class="text-center text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Find Your Next Flight
        </h1>
        <p class="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Search, compare and book flights in a few simple steps.
        </p>
        <div class="mt-8">
          <SearchForm />
        </div>
      </div>
    </section>
    <section class="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:grid-cols-3">
      <div v-for="f in features" :key="f.title" class="rounded-2xl p-5">
        <span class="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-600">
          <component :is="f.icon" class="size-5" aria-hidden="true" />
        </span>
        <h2 class="mt-3 font-semibold">{{ f.title }}</h2>
        <p class="mt-1 text-sm text-slate-600">{{ f.text }}</p>
      </div>
    </section>
  </div>
</template>
