# Testing

## Running tests

```bash
npm test
```

Runs Vitest in `backend/tests`. No database, network or Duffel token is needed: tests use mock Duffel-shaped fixtures
and an in-memory repository. (The running app never uses these mocks.)

```bash
npm run test:watch -w backend
```

## What is covered

| File | Covers |
|---|---|
| `duffel.mappers.test.ts` | Durations, stops, layovers, baggage, operating carriers, null conditions, e-tickets, offer de-duplication |
| `validation.test.ts` | Search rules (airports, dates, passengers), booking input (phone, email, names, conditions), lookup token format |
| `bookings.service.test.ts` | Confirmed only after order creation; ticketed vs not; idempotent replays (no second order, token rotation); price changes; expired offers; passenger age and passport rules; definitive failures vs unknown outcomes; disabled live bookings; webhook reconciliation via metadata; cancellations |
| `webhooks.test.ts` | Signature verification, tampering, replay window, payload parsing, event de-duplication |
| `app.test.ts` | HTTP envelope, validation error details, search endpoint, lookup 404 and `no-store`, unknown routes |

Helpers: `tests/fixtures/duffelOffer.ts` (mock Duffel offer/order), `tests/helpers.ts` (in-memory repository, fake
provider, booking input).

## Other checks

| Command | Checks |
|---|---|
| `npm run lint` | ESLint (TypeScript rules; Vue rules for the frontend) |
| `npm run typecheck` | `tsc` for the backend, `vue-tsc` for the frontend |
| `npm run build` | Production builds of both apps |
| `npm run format` | Prettier formatting |

## Before merging

There is no CI service; run the checks yourself before merging a pull request into `main` (Render deploys `main`
automatically):

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

If you changed Docker files, also build the images:

```bash
docker build . && docker compose build
```

## Manual end-to-end check

With a Duffel test token, follow [Getting started → Try it](getting-started.md#3-try-it): search LHR → JFK, book a
Duffel Airways offer, then retrieve it with the booking code.
