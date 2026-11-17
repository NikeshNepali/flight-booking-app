# Frontend

Vue 3 single-page app in `frontend/`, written with the Composition API (`<script setup lang="ts">`), built with Vite and
styled with Tailwind CSS 4.

## Pages

| Route | View | Purpose |
|---|---|---|
| `/` | `HomeView` | Headline and search form |
| `/search?from=…&to=…&depart=…` | `SearchResultsView` | Results, sorting, filters, load more |
| `/flights/:offerId` | `FlightDetailsView` | Full itinerary, price breakdown, conditions, expiry |
| `/book/:offerId/passengers` | `PassengerDetailsView` | Passenger and contact forms |
| `/book/:offerId/checkout` | `CheckoutView` | Final review, latest price, book |
| `/booking/confirmation` | `BookingConfirmationView` | Result and private booking code |
| `/booking/lookup` | `BookingLookupView` | Find a booking by code (also reads `#code=` links) |
| anything else | `NotFoundView` | 404 page |

Pages other than Home are lazy-loaded.

### Search parameters in the URL

`from`, `to`, `depart`, `return`, `adults`, `children` (comma-separated ages), `infants` (ages), `cabin`, plus display
labels `fromName`/`toName`. Refreshing or sharing a results URL re-runs the same search.

## Components

| Folder | Components |
|---|---|
| `common/` | `AppHeader`, `AirportAutocomplete` (accessible combobox), `PassengerSelector` (counts + ages), `AirlineLogo` (with fallback), `ErrorState`, `EmptyState` |
| `flights/` | `SearchForm`, `FlightCard`, `FlightCardSkeleton`, `SliceSummary`, `SliceTimeline` (segments + connections), `ResultsFilters`, `FareConditions`, `PriceBreakdown`, `OfferExpiry` |
| `booking/` | `BookingSteps` (progress), `PassengerFields`, `BookingStatus` (badges), `BookingDetails` (used by confirmation and lookup) |

## State

| Composable | Holds | Storage |
|---|---|---|
| `useBookingDraft` | Selected offer, passengers, contact, idempotency key | Memory only (cleared after booking; a refresh means re-entering details) |
| `useLastBooking` | The booking just created, for the confirmation page | `sessionStorage` (this tab only) |
| `useAirportSearch` | Debounced, cancellable airport suggestions | — |

The idempotency key is created when a checkout starts. It is **kept** after a network error, so retrying can't book
twice, and **replaced** after a definitive failure or a price change.

## API client

`services/api.ts` wraps Axios: base URL from `VITE_API_BASE_URL`, unwraps `{ success, data }`, and turns errors into an
`ApiError` with `code`, `status`, `details` and `fieldErrors`. `services/flights.ts` and `services/bookings.ts` expose
one function per endpoint. Types in `types/index.ts` mirror the backend's — update both when the API changes.

## Utilities

| File | Purpose |
|---|---|
| `utils/format.ts` | Money, durations, local times with time-zone labels, conditions, baggage text |
| `utils/offers.ts` | Sorting and filtering offers, airline list |
| `utils/passengerValidation.ts` | Same rules as the backend, for instant feedback |
| `utils/searchQuery.ts` | Search params ↔ URL query |
| `utils/dates.ts` | Local dates, age calculation |

## Styling

- Tailwind CSS 4 via `@tailwindcss/vite`; theme tokens (blue primary scale, font) in `src/assets/main.css`.
- A small set of reusable classes defined with `@utility`: `card`, `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`,
  `field-label`, `field-input`, `field-error`, `skeleton`.
- White background, rounded cards, generous spacing; responsive from phone width up.

## Accessibility

- Labels on every input, `aria-invalid` + error text on invalid fields, focus moves to the first invalid field.
- Airport autocomplete follows the ARIA combobox pattern with keyboard navigation (↑ ↓ Enter Esc).
- Radio groups and steps use `role`/`aria-checked`/`aria-current`; loading and status messages use live regions.
- Skip link, visible focus outlines, icon-only buttons have labels.

## Environment

`frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

Docker builds use `/api` (same origin). Anything in `VITE_*` ends up in the browser bundle — never put secrets there.
