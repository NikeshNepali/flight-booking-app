import type { BookingView, ContactForm, PassengerForm } from '@/types';
import { apiRequest } from './api';

export interface CreateBookingRequest {
  idempotencyKey: string;
  offerId: string;
  expectedTotal: { amount: string; currency: string };
  contact: ContactForm;
  passengers: PassengerForm[];
  includeDocuments: boolean;
}

export async function createBooking(
  req: CreateBookingRequest,
): Promise<{ booking: BookingView; status: number }> {
  const { data, status } = await apiRequest<BookingView>({
    url: '/bookings',
    method: 'POST',
    data: {
      idempotencyKey: req.idempotencyKey,
      offerId: req.offerId,
      expectedTotal: req.expectedTotal,
      acceptedConditions: true,
      contact: {
        email: req.contact.email.trim(),
        phone: req.contact.phone.replace(/[\s()-]/g, ''),
      },
      passengers: req.passengers.map((p) => ({
        id: p.id,
        title: p.title,
        gender: p.gender,
        givenName: p.givenName.trim(),
        familyName: p.familyName.trim(),
        bornOn: p.bornOn,
        ...(req.includeDocuments
          ? {
              identityDocument: {
                type: 'passport',
                uniqueIdentifier: p.passportNumber.trim().toUpperCase(),
                issuingCountryCode: p.passportCountry.trim().toUpperCase(),
                expiresOn: p.passportExpiresOn,
              },
            }
          : {}),
      })),
    },
  });
  return { booking: data, status };
}

export async function lookupBooking(token: string): Promise<BookingView> {
  const { data } = await apiRequest<BookingView>({
    url: '/bookings/lookup',
    method: 'POST',
    data: { token },
  });
  return data;
}
