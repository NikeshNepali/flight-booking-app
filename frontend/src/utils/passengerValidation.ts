import type { ContactForm, FlightOffer, PassengerForm } from '@/types';
import { ageOnDate, todayLocal } from './dates';

const NAME_RE = /^\p{L}[\p{L}\p{M}\s'.-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

/**
 * Client-side checks that mirror the backend rules, so most mistakes are caught before
 * submitting. The backend validates everything again. Keys are "<index>.<field>" or "contact.<field>".
 */
export function validatePassengers(
  offer: FlightOffer,
  passengers: PassengerForm[],
  contact: ContactForm,
) {
  const errors: Record<string, string> = {};
  const firstDeparture = offer.slices[0]?.departingAt.slice(0, 10) ?? todayLocal();
  const lastDeparture =
    offer.slices[offer.slices.length - 1]?.departingAt.slice(0, 10) ?? firstDeparture;

  passengers.forEach((p, i) => {
    if (!p.title) errors[`${i}.title`] = 'Select a title';
    if (!p.gender) errors[`${i}.gender`] = 'Select a gender';
    for (const field of ['givenName', 'familyName'] as const) {
      const value = p[field].trim();
      if (!value) errors[`${i}.${field}`] = 'Required';
      else if (!NAME_RE.test(value))
        errors[`${i}.${field}`] = 'Use letters, spaces, hyphens or apostrophes only';
    }
    if (!p.bornOn) {
      errors[`${i}.bornOn`] = 'Required';
    } else if (p.bornOn > todayLocal()) {
      errors[`${i}.bornOn`] = 'Date of birth cannot be in the future';
    } else {
      const age = ageOnDate(p.bornOn, firstDeparture);
      if (p.age !== null && p.age !== age) {
        errors[`${i}.bornOn`] =
          `This gives age ${age} at departure, but you searched for age ${p.age}. Search again with the correct age.`;
      } else if (p.type === 'adult' && age < 18) {
        errors[`${i}.bornOn`] = 'Adults must be 18 or older on the departure date';
      } else if (p.type === 'infant_without_seat' && ageOnDate(p.bornOn, lastDeparture) >= 2) {
        errors[`${i}.bornOn`] = 'Lap infants must be under 2 for the whole trip';
      }
    }
    if (offer.identityDocumentsRequired) {
      if (!/^[A-Za-z0-9]{5,20}$/.test(p.passportNumber.trim()))
        errors[`${i}.passportNumber`] = '5–20 letters or digits';
      if (!/^[A-Za-z]{2}$/.test(p.passportCountry.trim()))
        errors[`${i}.passportCountry`] = 'Use a 2-letter code, e.g. GB';
      if (!p.passportExpiresOn) errors[`${i}.passportExpiresOn`] = 'Required';
      else if (p.passportExpiresOn <= lastDeparture)
        errors[`${i}.passportExpiresOn`] = 'Must be valid after your last flight';
    }
  });

  if (!EMAIL_RE.test(contact.email.trim())) errors['contact.email'] = 'Enter a valid email address';
  if (!PHONE_RE.test(contact.phone.replace(/[\s()-]/g, ''))) {
    errors['contact.phone'] = 'Use international format starting with +, e.g. +44 20 8016 0509';
  }
  return errors;
}
