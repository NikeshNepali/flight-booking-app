# Getting started

There are two ways to run SkyRoute locally:

- **Docker only** — one command, nothing else to install. Best for trying the app.
- **npm (development mode)** — hot reload for frontend and backend. Best for changing code.

Both need a Duffel **test** access token.

## 1. Get a Duffel test token

1. Sign up at <https://app.duffel.com> (free).
2. Make sure the dashboard is in **Test mode**.
3. Open **Developers → Access tokens** and create a token. It starts with `duffel_test_`.

> Never commit the token. Put it only in `backend/.env` (git-ignored) or your hosting provider's environment
> variables. `backend/.env.example` is committed and must stay without real values.

## 2a. Run with Docker (all in one)

Requirements: Docker Desktop (or Docker Engine with Compose v2).

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set `DUFFEL_ACCESS_TOKEN=duffel_test_…`, then:

```bash
docker compose up --build
```

When the frontend container starts it prints:

```
  ==========================================================
    SkyRoute is running

    Open the app:      http://localhost:8080
    API health check:  http://localhost:8080/api/health
  ==========================================================
```

Alternatively `npm run docker:up` starts everything in the background, waits for the containers to be healthy and
prints the same message. Stop with `docker compose down` (or `npm run docker:down`). More in [Docker](docker.md).

## 2b. Run with npm (development mode)

Requirements: Node.js 20.19+ (22 recommended), npm, and Docker for the database (or any PostgreSQL 14+).

```bash
npm install
```

```bash
cp backend/.env.example backend/.env
```

```bash
cp frontend/.env.example frontend/.env
```

Set `DUFFEL_ACCESS_TOKEN` in `backend/.env`. Start PostgreSQL and create the tables:

```bash
npm run db:up
```

```bash
npm run db:migrate
```

Start the API and the web app in two terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

- Web app: <http://localhost:5173>
- API: <http://localhost:5000/api/health>

## 3. Try it

### Search

In test mode Duffel returns offers from its test airline **Duffel Airways (ZZ)** and test inventory from other
airlines. Try **London (LHR) → New York (JFK)**, a date in the next few months, 1 adult, Economy.

From the command line:

```bash
curl -s -X POST http://localhost:5000/api/flights/search -H 'Content-Type: application/json' -d '{"origin":"LHR","destination":"JFK","departureDate":"2027-03-15","adults":1,"cabinClass":"economy"}'
```

(Use port `8080` instead of `5000` when running with Docker.)

### Test booking

1. Pick an offer (Duffel Airways is a good choice in test mode) and press **Select flight**.
2. Review the itinerary and conditions, then **Continue to booking**.
3. Enter a made-up passenger — e.g. *Ms Amelia Earhart*, born *1987-07-24* — an email you control and a phone number
   in international format such as `+442080160509`.
4. Tick the confirmation box and press **Book now**. The order is paid from your Duffel **test balance**: no card, no
   real money, no real ticket.
5. The confirmation page shows the airline booking reference, the Duffel order ID (`ord_…`), the statuses and your
   **private booking code**. Save the code.
6. Open **Find my booking** and paste the code (or use the copied private link).

The order is also visible in the Duffel dashboard (test mode) under **Orders**.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev:backend` / `npm run dev:frontend` | Development servers with reload |
| `npm test` | Backend unit and HTTP tests (no database or Duffel needed) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks for both apps |
| `npm run build` | Production builds of both apps |
| `npm run format` | Prettier |
| `npm run db:up` / `npm run db:down` | Start / stop the Docker containers (database only for `db:up`) |
| `npm run db:migrate` | Apply migrations (Drizzle Kit) |
| `npm run db:generate` | Create a migration after changing `backend/src/db/schema` |
| `npm run docker:up` / `docker:down` / `docker:logs` | Full Docker stack |

Next: [Architecture](architecture.md).
