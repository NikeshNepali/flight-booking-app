import type { PassengerInput } from '../../types/booking.js';
import type { FlightOffer, PassengerType } from '../../types/flights.js';
import { AppError, ErrorCodes } from '../../utils/AppError.js';
import { ageOnDate } from '../../utils/duration.js';
import { todayUtc } from '../../utils/dates.js';

interface PassengerProblem {
  passengerId: string;
  field: string;
  message: string;
}

/** Derives the passenger type Duffel uses from an age in years. */
function typeForAge(age: number): PassengerType {
  if (age >= 18) return 'adult';
  if (age >= 2) return 'child';
  return 'infant_without_seat';
}

/**
 * Checks submitted passengers against the latest offer before we ask the airline to book:
 * every offer passenger must be present exactly once, birth dates must match the ages and
 * types used at search time, and travel documents must be present (and valid for the
 * whole trip) only when the airline requires them.
 *
 * Returns the passengers ready to send — documents are dropped when not required, so we
 * never transmit more personal data than needed.
 */
export function preparePassengers(
  offer: FlightOffer,
  submitted: PassengerInput[],
): PassengerInput[] {
  const problems: PassengerProblem[] = [];
  const offerIds = new Set(offer.passengers.map((p) => p.id));
  const submittedIds = new Set(submitted.map((p) => p.id));

  if (submittedIds.size !== submitted.length) {
    problems.push({
      passengerId: '',
      field: 'id',
      message: 'Each passenger may only be submitted once',
    });
  }
  for (const id of offerIds) {
    if (!submittedIds.has(id))
      problems.push({ passengerId: id, field: 'id', message: 'Passenger details missing' });
  }
  for (const id of submittedIds) {
    if (!offerIds.has(id))
      problems.push({
        passengerId: id,
        field: 'id',
        message: 'Passenger is not part of this offer',
      });
  }

  const firstDeparture = offer.slices[0]?.departingAt.slice(0, 10) ?? todayUtc();
  const lastDeparture =
    offer.slices[offer.slices.length - 1]?.departingAt.slice(0, 10) ?? firstDeparture;
  const today = todayUtc();

  for (const passenger of submitted) {
    const offerPassenger = offer.passengers.find((p) => p.id === passenger.id);
    if (!offerPassenger) continue;

    if (passenger.bornOn > today) {
      problems.push({
        passengerId: passenger.id,
        field: 'bornOn',
        message: 'Date of birth cannot be in the future',
      });
      continue;
    }

    const ageAtDeparture = ageOnDate(passenger.bornOn, firstDeparture);
    if (offerPassenger.age !== null && offerPassenger.age !== ageAtDeparture) {
      problems.push({
        passengerId: passenger.id,
        field: 'bornOn',
        message: `Date of birth gives age ${ageAtDeparture} on the departure date, but the search was for age ${offerPassenger.age}. Please search again with the correct age.`,
      });
    } else if (offerPassenger.type && typeForAge(ageAtDeparture) !== offerPassenger.type) {
      problems.push({
        passengerId: passenger.id,
        field: 'bornOn',
        message: `Date of birth does not match the passenger type (${offerPassenger.type.replaceAll('_', ' ')}).`,
      });
    }
    if (
      offerPassenger.type === 'infant_without_seat' &&
      ageOnDate(passenger.bornOn, lastDeparture) >= 2
    ) {
      problems.push({
        passengerId: passenger.id,
        field: 'bornOn',
        message: 'Lap infants must be under 2 for the whole trip.',
      });
    }

    if (offer.identityDocumentsRequired) {
      if (!passenger.identityDocument) {
        problems.push({
          passengerId: passenger.id,
          field: 'identityDocument',
          message: 'The airline requires passport details for this booking',
        });
      } else if (passenger.identityDocument.expiresOn <= lastDeparture) {
        problems.push({
          passengerId: passenger.id,
          field: 'identityDocument.expiresOn',
          message: 'Passport must be valid beyond the last flight date',
        });
      }
    }
  }

  if (problems.length > 0) {
    throw new AppError(422, ErrorCodes.INVALID_PASSENGERS, 'Please check the passenger details.', {
      problems,
    });
  }

  return submitted.map((p) =>
    offer.identityDocumentsRequired ? p : { ...p, identityDocument: undefined },
  );
}
