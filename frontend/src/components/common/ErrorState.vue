<script setup lang="ts">
import { CircleAlert, RotateCw } from 'lucide-vue-next';

defineProps<{ title?: string; message: string; retryLabel?: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="card flex flex-col items-center px-6 py-10 text-center" role="alert">
    <span class="grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
      <CircleAlert class="size-6" aria-hidden="true" />
    </span>
    <h2 class="mt-4 text-lg font-semibold">{{ title ?? 'Something went wrong' }}</h2>
    <p class="mt-1 max-w-md text-sm text-slate-600">{{ message }}</p>
    <div class="mt-5 flex flex-wrap justify-center gap-2">
      <button v-if="retryLabel" type="button" class="btn-primary" @click="$emit('retry')">
        <RotateCw class="size-4" aria-hidden="true" />{{ retryLabel }}
      </button>
      <slot />
    </div>
  </div>
</template>
