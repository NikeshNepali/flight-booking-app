# SkyRoute — Flight Search & Booking

Flight search and booking app: Vue 3 + TypeScript frontend, Express + TypeScript + Zod backend,
PostgreSQL + Drizzle ORM, and the [Duffel](https://duffel.com/docs/guides/getting-started-with-flights) Flights API
(test mode by default).

## Progress

- [x] Backend: Express API, Duffel integration, flight search endpoints
- [x] Database: PostgreSQL schema and migrations
- [ ] Bookings
- [ ] Frontend
- [ ] Docker & Render deployment

## Run locally

```bash
npm install
cp backend/.env.example backend/.env   # then set DUFFEL_ACCESS_TOKEN=duffel_test_...
npm run db:up        # PostgreSQL in Docker
npm run db:migrate
npm run dev:backend  # http://localhost:5000/api/health
npm test
```

## API

```
GET  /api/health
GET  /api/airports?query=London
POST /api/flights/search
GET  /api/flights/offer-requests/:id/offers?after=...
GET  /api/flights/offers/:offerId
```
