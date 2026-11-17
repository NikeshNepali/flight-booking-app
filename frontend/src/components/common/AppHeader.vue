<script setup lang="ts">
import { Plane, Search, Ticket } from 'lucide-vue-next';
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 text-lg font-bold text-slate-900">
        <span class="grid size-8 place-items-center rounded-lg bg-primary-600 text-white">
          <Plane class="size-5 -rotate-45" aria-hidden="true" />
        </span>
        SkyRoute
      </RouterLink>
      <nav aria-label="Main" class="flex items-center gap-1 text-sm font-medium">
        <RouterLink
          to="/"
          class="btn-ghost"
          active-class="bg-primary-50"
          aria-label="Search flights"
        >
          <Search class="size-4" aria-hidden="true" /><span class="hidden sm:inline"
            >Search flights</span
          >
        </RouterLink>
        <RouterLink
          :to="{ name: 'lookup' }"
          class="btn-ghost"
          active-class="bg-primary-50"
          aria-label="Find my booking"
        >
          <Ticket class="size-4" aria-hidden="true" /><span class="hidden sm:inline"
            >Find my booking</span
          >
        </RouterLink>
      </nav>
    </div>
  </header>
</template>
