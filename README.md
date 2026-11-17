# SkyRoute — Flight Search & Booking

Flight search and booking app: Vue 3 + TypeScript frontend, Express + TypeScript + Zod backend,
PostgreSQL + Drizzle ORM, and the [Duffel](https://duffel.com/docs/guides/getting-started-with-flights) Flights API
(test mode by default).

## Progress

- [x] Backend: Express API, Duffel integration, flight search endpoints
- [x] Database: PostgreSQL schema and migrations
- [x] Bookings: Duffel orders stored in PostgreSQL, secure lookup, webhooks
- [x] Frontend: Vue web app (search, results, details, passengers, checkout, confirmation, lookup)
- [ ] Docker & Render deployment

## Run locally

```bash
npm install
cp backend/.env.example backend/.env   # then set DUFFEL_ACCESS_TOKEN=duffel_test_...
npm run db:up        # PostgreSQL in Docker
npm run db:migrate
npm run dev:backend  # http://localhost:5000/api/health
cp frontend/.env.example frontend/.env
npm run dev:frontend # http://localhost:5173
npm test
```

## API

```
GET  /api/health
GET  /api/airports?query=London
POST /api/flights/search
GET  /api/flights/offer-requests/:id/offers?after=...
GET  /api/flights/offers/:offerId
POST /api/bookings
POST /api/bookings/lookup
POST /api/webhooks/duffel
```
