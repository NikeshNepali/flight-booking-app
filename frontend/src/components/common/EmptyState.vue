<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{ icon: Component; title: string; message: string }>();
</script>

<template>
  <div class="card flex flex-col items-center px-6 py-12 text-center">
    <span class="grid size-12 place-items-center rounded-full bg-primary-50 text-primary-600">
      <component :is="icon" class="size-6" aria-hidden="true" />
    </span>
    <h2 class="mt-4 text-lg font-semibold">{{ title }}</h2>
    <p class="mt-1 max-w-md text-sm text-slate-600">{{ message }}</p>
    <div class="mt-5"><slot /></div>
  </div>
</template>
