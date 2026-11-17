<template>
  <div class="card p-5" aria-hidden="true">
    <div class="flex flex-col gap-5 md:flex-row md:items-center">
      <div class="flex-1 space-y-5">
        <div v-for="n in 2" :key="n" class="flex items-center gap-4">
          <div class="skeleton size-10 rounded-lg" />
          <div class="flex flex-1 items-center gap-4">
            <div class="space-y-2">
              <div class="skeleton h-5 w-14" />
              <div class="skeleton h-3 w-10" />
            </div>
            <div class="skeleton h-2 flex-1" />
            <div class="space-y-2">
              <div class="skeleton h-5 w-14" />
              <div class="skeleton h-3 w-10" />
            </div>
          </div>
        </div>
      </div>
      <div class="space-y-2 md:w-40 md:border-l md:border-slate-100 md:pl-5">
        <div class="skeleton h-7 w-24" />
        <div class="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  </div>
</template>
