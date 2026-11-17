<script setup lang="ts">
import { computed } from 'vue';
import type { PassengerForm } from '@/types';
import { passengerTypeLabel } from '@/utils/format';

const props = defineProps<{
  index: number;
  requireDocuments: boolean;
  errors: Record<string, string>;
}>();
const passenger = defineModel<PassengerForm>({ required: true });

const prefix = computed(() => `p${props.index}`);
const err = (field: string) => props.errors[`${props.index}.${field}`];
const titles = [
  { value: 'mr', label: 'Mr' },
  { value: 'ms', label: 'Ms' },
  { value: 'mrs', label: 'Mrs' },
  { value: 'miss', label: 'Miss' },
  { value: 'dr', label: 'Dr' },
];
</script>

<template>
  <fieldset class="card p-5">
    <legend class="sr-only">Passenger {{ index + 1 }}</legend>
    <div class="mb-4 flex items-center justify-between">
      <h3 class="font-semibold">Passenger {{ index + 1 }}</h3>
      <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{{
        passengerTypeLabel(passenger.type, passenger.age)
      }}</span>
    </div>
    <p class="mb-4 text-xs text-slate-500">
      Enter names exactly as they appear on the passport or ID used for travel.
    </p>

    <div class="grid gap-4 sm:grid-cols-6">
      <div class="sm:col-span-2">
        <label :for="`${prefix}-title`" class="field-label">Title</label>
        <select
          :id="`${prefix}-title`"
          v-model="passenger.title"
          class="field-input"
          :aria-invalid="Boolean(err('title'))"
          required
        >
          <option value="" disabled>Select</option>
          <option v-for="t in titles" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <p v-if="err('title')" class="field-error">{{ err('title') }}</p>
      </div>
      <div class="sm:col-span-2">
        <label :for="`${prefix}-gender`" class="field-label"
          >Gender <span class="font-normal text-slate-400">(as on passport)</span></label
        >
        <select
          :id="`${prefix}-gender`"
          v-model="passenger.gender"
          class="field-input"
          :aria-invalid="Boolean(err('gender'))"
          required
        >
          <option value="" disabled>Select</option>
          <option value="f">Female</option>
          <option value="m">Male</option>
        </select>
        <p v-if="err('gender')" class="field-error">{{ err('gender') }}</p>
      </div>
      <div class="sm:col-span-2">
        <label :for="`${prefix}-dob`" class="field-label">Date of birth</label>
        <input
          :id="`${prefix}-dob`"
          v-model="passenger.bornOn"
          type="date"
          class="field-input"
          autocomplete="bday"
          :aria-invalid="Boolean(err('bornOn'))"
          required
        />
        <p v-if="err('bornOn')" class="field-error">{{ err('bornOn') }}</p>
      </div>
      <div class="sm:col-span-3">
        <label :for="`${prefix}-given`" class="field-label">Given name(s)</label>
        <input
          :id="`${prefix}-given`"
          v-model="passenger.givenName"
          type="text"
          class="field-input"
          autocomplete="given-name"
          maxlength="50"
          :aria-invalid="Boolean(err('givenName'))"
          required
        />
        <p v-if="err('givenName')" class="field-error">{{ err('givenName') }}</p>
      </div>
      <div class="sm:col-span-3">
        <label :for="`${prefix}-family`" class="field-label">Family name</label>
        <input
          :id="`${prefix}-family`"
          v-model="passenger.familyName"
          type="text"
          class="field-input"
          autocomplete="family-name"
          maxlength="50"
          :aria-invalid="Boolean(err('familyName'))"
          required
        />
        <p v-if="err('familyName')" class="field-error">{{ err('familyName') }}</p>
      </div>
    </div>

    <div v-if="requireDocuments" class="mt-5 border-t border-slate-100 pt-4">
      <h4 class="text-sm font-semibold">Passport details</h4>
      <p class="mb-3 text-xs text-slate-500">
        Required by the airline for this booking. Sent to the airline only — we do not store
        passport details.
      </p>
      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <label :for="`${prefix}-pp`" class="field-label">Passport number</label>
          <input
            :id="`${prefix}-pp`"
            v-model="passenger.passportNumber"
            type="text"
            class="field-input uppercase"
            autocomplete="off"
            maxlength="20"
            :aria-invalid="Boolean(err('passportNumber'))"
          />
          <p v-if="err('passportNumber')" class="field-error">{{ err('passportNumber') }}</p>
        </div>
        <div>
          <label :for="`${prefix}-ppc`" class="field-label">Issuing country (2 letters)</label>
          <input
            :id="`${prefix}-ppc`"
            v-model="passenger.passportCountry"
            type="text"
            class="field-input uppercase"
            placeholder="GB"
            maxlength="2"
            :aria-invalid="Boolean(err('passportCountry'))"
          />
          <p v-if="err('passportCountry')" class="field-error">{{ err('passportCountry') }}</p>
        </div>
        <div>
          <label :for="`${prefix}-ppe`" class="field-label">Expiry date</label>
          <input
            :id="`${prefix}-ppe`"
            v-model="passenger.passportExpiresOn"
            type="date"
            class="field-input"
            :aria-invalid="Boolean(err('passportExpiresOn'))"
          />
          <p v-if="err('passportExpiresOn')" class="field-error">{{ err('passportExpiresOn') }}</p>
        </div>
      </div>
    </div>
  </fieldset>
</template>
