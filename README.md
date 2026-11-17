**🌐 Live demo: [https://skyroute-uh6w.onrender.com](https://skyroute-uh6w.onrender.com)**

> Runs in Duffel **test mode** — search and book freely: no real money is charged and no real tickets are issued.
> Hosted on Render's free plan, so the first visit after a quiet period can take about a minute to wake up.

# SkyRoute — Flight Search & Booking

A full-stack flight search and booking app. Search the airlines available through the
[Duffel](https://duffel.com) Flights API, compare and filter offers, enter passenger details and create a **real
Duffel airline order** (test mode by default). Guests retrieve bookings later with a private booking code — no account
needed.

**Stack:** Vue 3 · TypeScript · Vite · Tailwind CSS · Express 5 · Zod · PostgreSQL · Drizzle ORM · Docker · Render

## Features

- Airport/city autocomplete, one-way and round trips, adults/children/infants, cabin class
- Results with airline logos, local times and time zones, stops, layovers, baggage; sort and filter; load more
- Flight details with full itinerary, fare conditions and live re-pricing before checkout
- Passenger forms that ask for passports only when the airline requires them
- Idempotent booking (no double orders), clear pending / confirmed / ticketed / failed states
- Secure booking lookup with hashed private codes; signed Duffel webhooks
- Docker setup (database + API + web app) and a one-click Render Blueprint

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env
```

Put your Duffel test token (`duffel_test_…`, free at [app.duffel.com](https://app.duffel.com)) into
`DUFFEL_ACCESS_TOKEN` in `backend/.env`, then:

```bash
docker compose up --build
```

Open the URL printed by the frontend container: **http://localhost:8080**.

For development with hot reload (`npm run dev:backend` / `npm run dev:frontend`), see
[Getting started](docs/getting-started.md).

## Deploy

Render dashboard → **New → Blueprint** → select this repository → enter your Duffel token → **Apply**.
Details: [Deploying to Render](docs/deployment-render.md).

## Documentation

Everything is in [`docs/`](docs/README.md):

| | |
|---|---|
| [Getting started](docs/getting-started.md) | [Architecture](docs/architecture.md) |
| [Booking flow](docs/booking-flow.md) | [API reference](docs/api-reference.md) |
| [Database](docs/database.md) | [Duffel integration](docs/duffel-integration.md) |
| [Frontend](docs/frontend.md) | [Configuration](docs/configuration.md) |
| [Docker](docs/docker.md) | [Deploying to Render](docs/deployment-render.md) |
| [Security & privacy](docs/security.md) | [Testing](docs/testing.md) |
| [Contributing](docs/contributing.md) | [Troubleshooting](docs/troubleshooting.md) |

## Important

- Test mode is the default: bookings use Duffel's test balance, so no real money moves and no real tickets are issued.
- Live bookings need a live token, `DUFFEL_MODE=live` **and** `DUFFEL_LIVE_BOOKINGS_ENABLED=true`. This app does not
  charge travellers — see [what needs Duffel approval](docs/duffel-integration.md#what-needs-a-duffel-account-or-approval).
- Offers come from the airlines Duffel connects to; not every airline or route worldwide is available.
