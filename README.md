# SkyRoute — Flight Search & Booking

A small, full-stack flight search and booking app built with **Vue 3 + TypeScript + Tailwind** on the front end,
**Express + TypeScript + Zod** on the back end, **PostgreSQL + Drizzle ORM** for storage, and the
**[Duffel](https://duffel.com/docs/guides/getting-started-with-flights) Flights API** as the flight provider.

It searches the airlines Duffel connects to, lets travellers compare and filter offers, re-checks the offer
before checkout, and creates a **real Duffel order** (in test mode by default). A booking is shown as
confirmed only after Duffel returns the created airline order.

> The app shows the offers that Duffel returns. It does not cover every airline or route in the world.

---

## Architecture

```
Browser (Vue SPA)  ──HTTP/JSON──▶  Express API  ──HTTPS──▶  Duffel API
                                     │
                                     └──▶ PostgreSQL (bookings, passengers, webhook events)
```

**Backend layers** (`backend/src`)

| Layer | Where | Responsibility |
|---|---|---|
| Routes | `modules/*/*.routes.ts` | URL → handler, rate limits, provider-configured check |
| Controllers | `modules/*/*.controller.ts` | Parse/validate input with Zod, send JSON |
| Services | `modules/*/*.service.ts` | Business logic (price re-check, idempotency, state changes) |
| Repository | `modules/bookings/bookings.repository.ts` | All SQL via Drizzle (parameterised, transactions) |
| Provider | `integrations/duffel/*` | The **only** code that knows Duffel. Implements the `FlightProvider` interface (`types/provider.ts`), so another provider can replace it |
| Schema | `db/schema/*` + `db/migrations/*` | Tables, enums, constraints, indexes |

Every response uses the same envelope: `{ "success": true, "data": … }` or
`{ "success": false, "error": { "code", "message", "details" } }`.

**Booking flow (what actually happens)**

1. `GET /api/flights/offers/:id` — the details page fetches the offer fresh from Duffel and flags price changes.
2. Checkout fetches the offer again, then `POST /api/bookings` with a client-generated **idempotency key**.
3. The server:
   - returns the existing booking if that key was already used (no second airline order or charge);
   - re-fetches the offer → `410 OFFER_EXPIRED` or `409 PRICE_CHANGED` (the user must accept the new price);
   - validates passengers against the offer (ages vs. birth dates, infants under 2, passports only when required);
   - inserts a `pending` booking + passengers in a **transaction**;
   - calls Duffel `POST /air/orders` (`type: instant`, payment `type: balance`, `metadata.booking_id`);
   - on success stores the order id, airline booking reference, ticket numbers and an itinerary snapshot → `confirmed`;
   - on a definitive rejection → `failed`; on a timeout/5xx (outcome unknown) it stays `pending` and is reconciled by the
     `order.created` webhook via `metadata.booking_id` — the user is told not to rebook.
4. The response includes a 256-bit **lookup token**, shown once. Only its SHA-256 hash is stored.

**Statuses**: `status` = pending / confirmed / failed / cancelled. `ticketing_status` = not_issued / issued
(confirmed ≠ ticketed — e-ticket numbers appear only when the airline issues them). `payment_status` is separate.

### API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Server, DB and provider status |
| GET | `/api/airports?query=London` | Airport/city autocomplete (Duffel Places suggestions) |
| POST | `/api/flights/search` | Create offer request, return first page of offers |
| GET | `/api/flights/offer-requests/:id/offers?after=…` | Next page of offers (cursor pagination) |
| GET | `/api/flights/offers/:offerId` | Latest price/availability for one offer |
| POST | `/api/bookings` | Create a Duffel order (idempotent) |
| POST | `/api/bookings/lookup` | Retrieve a booking with `{ "token": "…" }` |
| POST | `/api/webhooks/duffel` | Signed Duffel webhooks (order updates, cancellations) |

Lookup is a **POST** (not `GET /lookup/:token`) so the secret never lands in URLs, server logs or browser history.
The “private link” on the confirmation page uses a URL fragment (`#code=…`), which browsers never send to servers.

---

## Project structure

```
.
├── Dockerfile                  # backend image; default target also bundles the web app (Render)
├── render.yaml                 # Render Blueprint (web service + PostgreSQL)
├── docker-compose.yml          # local stack: postgres + backend + frontend
├── package.json                # npm workspaces + convenience scripts
├── backend/
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── app.ts / server.ts  # app factory (DI) / process entry
│   │   ├── config/env.ts       # Zod-validated env + test/live safety checks
│   │   ├── db/{index.ts,migrate.ts,schema/,migrations/}
│   │   ├── integrations/duffel/{duffel.client,duffel.service,duffel.mappers,duffel.types,index}.ts
│   │   ├── middleware/{errorHandler,rateLimit,requireProvider}.ts
│   │   ├── modules/
│   │   │   ├── flights/{routes,controller,service,validation}
│   │   │   ├── bookings/{routes,controller,service,repository,validation,passengers}
│   │   │   └── webhooks/{routes,service,webhookSignature}
│   │   ├── types/{flights,booking,provider}.ts
│   │   └── utils/
│   └── tests/                  # Vitest + supertest, mock Duffel fixtures
└── frontend/
    ├── Dockerfile              # nginx image for docker compose
    ├── nginx.conf
    └── src/
        ├── components/{common,flights,booking}/
        ├── composables/        # airport search, in-memory booking draft
        ├── services/           # axios API client
        ├── views/              # Home, Results, Details, Passengers, Checkout, Confirmation, Lookup
        ├── router/ types/ utils/
        └── App.vue main.ts
```

---

## Local setup

Requirements: **Node.js 20.19+** (22/24 recommended), npm, and Docker (or any local PostgreSQL 14+).
To deploy instead, jump to [Deploying to Render](#deploying-to-render-docker).

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and set `DUFFEL_ACCESS_TOKEN` (see below). Then start PostgreSQL and run the migrations:

```bash
npm run db:up
```

```bash
npm run db:migrate
```

Start the API (http://localhost:5000) and the web app (http://localhost:5173) in two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Other commands:

```bash
npm test            # backend unit + HTTP tests (no DB or Duffel needed)
npm run typecheck   # backend tsc + frontend vue-tsc
npm run lint        # ESLint for both
npm run build       # production builds
npm run db:generate # create a new migration after editing backend/src/db/schema
```

Not using Docker? Create a database yourself (`createdb flightbooking`) and point `DATABASE_URL` at it.

### Duffel test token

1. Sign up at <https://app.duffel.com> (free).
2. Make sure the dashboard is in **Test mode**, open **Developers → Access tokens**, and create a token.
3. Paste it into `backend/.env` as `DUFFEL_ACCESS_TOKEN=duffel_test_…` and restart the backend.

Safety rails:
- With `DUFFEL_MODE=test` the server **refuses to start** unless the token starts with `duffel_test_` (and vice versa for live).
- Every Duffel response's `live_mode` is checked against the configured mode.
- Without a token, the app still runs and shows a clear configuration error instead of results — it never substitutes fake data.

### Example flight search

In test mode, Duffel returns offers from its test airline **Duffel Airways (ZZ)** plus test inventory.
Try **London (LHR) → New York (JFK)**, any date in the next few months, 1 adult, Economy.

Or via curl:

```bash
curl -s -X POST http://localhost:5000/api/flights/search -H 'Content-Type: application/json' -d '{"origin":"LHR","destination":"JFK","departureDate":"2027-03-15","adults":1,"cabinClass":"economy"}'
```

### Example test booking

1. Search LHR → JFK and pick a **Duffel Airways** offer.
2. Continue, fill in a made-up passenger (e.g. *Ms Amelia Earhart*, born 1987-07-24), an email you control, and a phone in
   international format (e.g. `+442080160509`).
3. Tick the confirmation box and press **Book now**. The order is paid from your Duffel **test balance**.
4. The confirmation page shows the airline booking reference, the Duffel order ID (`ord_…`), statuses, and your private
   booking code. The order also appears in the Duffel dashboard (test mode) under Orders.
5. Open **Find my booking** and paste the code (or use the copied private link).

### Webhooks (optional locally)

1. Expose the API, e.g. `ngrok http 5000`.
2. In the Duffel dashboard → Developers → Webhooks, add `https://<your-tunnel>/api/webhooks/duffel` and subscribe to order events.
3. Copy the webhook secret into `DUFFEL_WEBHOOK_SECRET` and restart.

Signatures (`X-Duffel-Signature: t=…,v1=…`, HMAC-SHA256 of `"<t>.<raw body>"`) are verified with a 5-minute replay window.
Events are de-duplicated by event id in `booking_events`, and the order is always re-fetched from Duffel rather than
trusting the payload.

---

## Deploying to Render (Docker)

Production runs as **one Docker container**: Express serves the API under `/api` and the built Vue app from the same
origin (no CORS setup or separate static site needed). On start the container applies any pending database migrations
(`backend/dist/db/migrate.js`, using drizzle-orm's runtime migrator) and then starts the server. If a migration fails
the container exits, and Render keeps the previous deploy live.

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build: builds both workspaces, then a small `node:22-alpine` runtime as the non-root `node` user |
| `.dockerignore` | Keeps `.env` files, `node_modules` and build output out of the image |
| `render.yaml` | Render Blueprint: Docker web service + managed PostgreSQL, health check `/api/health` |

### One-time setup

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, pick the repository. Render reads `render.yaml` and proposes a web service
   `skyroute` and a database `skyroute-db`.
3. When prompted, fill in the secret values:
   - `DUFFEL_ACCESS_TOKEN`: your `duffel_test_…` token
   - `DUFFEL_WEBHOOK_SECRET`: optional, leave empty until you set up webhooks
4. Click **Apply**. The first build takes a few minutes. Your app will be at `https://skyroute-<random>.onrender.com`.
5. Optional: in Duffel → Developers → Webhooks, add `https://<your-app>.onrender.com/api/webhooks/duffel`, then paste the
   secret into `DUFFEL_WEBHOOK_SECRET` in Render (Environment tab). The service restarts automatically.

Every push to the default branch then redeploys automatically (`autoDeploy: true`).

Notes:
- Render sets `PORT` and `RENDER_EXTERNAL_URL` itself; the app listens on `PORT` and allows its own URL for CORS.
  Use `FRONTEND_URL` only if you also serve the frontend from another domain.
- `DATABASE_URL` comes from the Render database's **internal** connection string, so no TLS setting is needed. If you
  point at an external database that requires TLS, set `DATABASE_SSL=true`.
- **Free plans:** the web service sleeps after ~15 minutes of inactivity (the first request then takes ~1 minute), and
  free Render PostgreSQL databases expire after 30 days. Pick paid plans in `render.yaml` (or the dashboard) for anything real.
- The Blueprint keeps `DUFFEL_MODE=test` and `DUFFEL_LIVE_BOOKINGS_ENABLED=false`. Read *What needs a Duffel account or
  production approval* below before changing them.

### Running everything locally with Docker (all in one)

No Node.js needed — just Docker:

```bash
cp backend/.env.example backend/.env
```

```bash
docker compose up --build
```

This starts three containers:

| Container | What it runs | Address |
|---|---|---|
| `frontend` | Vue app served by nginx; forwards `/api` to the backend | http://localhost:8080 |
| `backend` | Express API (applies migrations on start) | internal only, via the frontend |
| `postgres` | PostgreSQL 17 | `localhost:5432` |

DUFFEL settings come from `backend/.env`. Stop everything with `docker compose down` (add `-v` to also delete the
database). The same commands are available as `npm run docker:up` / `npm run docker:down`. Containers restart
automatically if they crash, and the backend reconnects by itself if the database restarts.

Render uses the default target of the root `Dockerfile`, which serves the API and web app from a single container
(cheaper on Render). Docker Compose uses the `api` target plus `frontend/Dockerfile`.

### Connecting a database client (pgAdmin, DBeaver, TablePlus, psql)

| Setting | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `flightbooking` |
| Username | `postgres` |
| Password | `postgres` |

If your client has a saved server for another project on `localhost:5432` (for example a `django_user` login), it will
fail against this database: only one Postgres can use port 5432 at a time, and this one only has the `postgres` user.
Add a new server with the settings above.

---

## Security & privacy

- Duffel token and webhook secret live only in `backend/.env`; the frontend only knows the API URL.
- All input validated with Zod on the server (and mirrored in the UI). Body size limited; Helmet headers; CORS restricted to `FRONTEND_URL`.
- Rate limits: search 20/min, airports 120/min, bookings 10/15 min, lookups 30/15 min per IP.
- No card data is ever collected or stored. Passport details are sent to Duffel only when the airline requires them and are **never stored**.
- Stored PII is limited to contact email/phone and passenger names, birth dates and types. Logs contain ids and error codes only.
- Lookup tokens: 256-bit random, hashed (SHA-256) at rest, unique; bookings are never retrievable by id, email or name.
- Passenger form data lives only in memory in the browser tab and is cleared after booking.
- The Book button is disabled while submitting, a page-leave warning is shown, and the idempotency key protects retries.

---

## What needs a Duffel account or production approval

| Item | Status in this project |
|---|---|
| **Test token** | Required to search/book at all. Free, self-serve. |
| **Test bookings** | Fully implemented. Paid with Duffel's test balance — no real money, no real tickets. |
| **Live mode** | Requires Duffel to verify/activate your organisation for live access. Then set `DUFFEL_MODE=live`, a `duffel_live_` token, **and** `DUFFEL_LIVE_BOOKINGS_ENABLED=true` (bookings are blocked otherwise). |
| **Paying for live orders** | This build pays with `type: "balance"`, i.e. **your agency's pre-funded Duffel balance** — it does **not** charge the traveller. To collect money from travellers you need **Duffel Payments** (card collection via Duffel's PCI-compliant component and 3-D Secure, which requires enabling on your account) or your own PCI-compliant payment provider (e.g. a hosted checkout) that charges the customer before the order is created. That integration is intentionally not included, so no real-money flow can be activated by accident. |
| **Hold orders / pay later** | Not implemented (all orders are `instant`). |
| **Webhooks** | Need a public HTTPS URL and a secret from the dashboard. Without them, bookings still work; lookups refresh order state from Duffel at most once a minute. |
| **Emails/e-tickets to travellers** | Not included: no email service is configured. Airlines/Duffel may send their own notifications depending on your account setup. |
| **Legal** | Live selling usually needs a travel-seller licence/accreditation depending on your country, your own terms & privacy policy, and airline-specific conditions shown to customers. |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| “Flight provider is not configured” | Set `DUFFEL_ACCESS_TOKEN` in `backend/.env` and restart `npm run dev:backend`. |
| Server exits with “is not a test token” | Your token doesn't match `DUFFEL_MODE`. Use a `duffel_test_…` token in test mode. |
| “provider rejected our credentials” | The token was revoked or copied incorrectly; create a new one. |
| `database: "unavailable"` in `/api/health`, or migrate fails with `ECONNREFUSED` | Start Postgres with `npm run db:up` and check `DATABASE_URL`. |
| pgAdmin/another client says `password authentication failed for user "…"` | It is using another project's login. Connect with `postgres` / `postgres` to database `flightbooking` (see *Connecting a database client*). |
| Port 5432 already in use | Another Postgres (Homebrew, or another project's container) is running. Stop it, or change the left side of `'5432:5432'` in `docker-compose.yml` and your `DATABASE_URL`. |
| Port 5000 already in use (macOS) | macOS AirPlay Receiver uses port 5000. Turn it off in System Settings → General → AirDrop & Handoff, or set `PORT=5050` in `backend/.env` **and** `VITE_API_BASE_URL=http://localhost:5050/api` in `frontend/.env`. |
| “Cannot reach the server” in the UI | The backend isn't running, or `VITE_API_BASE_URL` / `FRONTEND_URL` don't match your ports (CORS). |
| Searches are slow | Offer requests ask many airlines; up to ~20 s is normal. `DUFFEL_TIMEOUT_MS` controls the limit. |
| “No flights found” | Test inventory is limited — try LHR → JFK, other dates, or Economy. |
| “Date of birth gives age X…” | Child/infant ages chosen at search must match birth dates on the departure date. Search again with the right ages. |
| `npm audit` shows moderate esbuild warnings | They come from `drizzle-kit`'s dev-only dependency tree (used for migrations, not shipped). Don't run `npm audit fix --force` — it downgrades drizzle-kit. |

---

## Tests

`npm test` runs Vitest in `backend/tests`:

- Duffel mapping (durations, connections, baggage, conditions, e-tickets) and offer de-duplication
- Search/booking/lookup validation schemas
- Booking service: confirmation only after order creation, idempotent replays, price changes, expired offers,
  passenger/age/passport rules, definitive failures vs. unknown outcomes, disabled live bookings, webhook reconciliation
- Webhook signature verification, replay window and event de-duplication
- HTTP envelope, validation errors and 404s via supertest

Tests use mock Duffel-shaped fixtures (`tests/fixtures`) and an in-memory repository; the running app never uses them.
