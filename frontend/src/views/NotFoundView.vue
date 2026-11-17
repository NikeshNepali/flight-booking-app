<script setup lang="ts">
import { MapPinOff } from 'lucide-vue-next';
import EmptyState from '@/components/common/EmptyState.vue';
</script>

<template>
  <div class="mx-auto max-w-xl px-4 py-16">
    <EmptyState
      :icon="MapPinOff"
      title="Page not found"
      message="This page doesn't exist or has moved."
    >
      <RouterLink to="/" class="btn-primary">Go to search</RouterLink>
    </EmptyState>
  </div>
</template>
