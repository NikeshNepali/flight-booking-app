# Troubleshooting

## Flight provider

| Symptom | Fix |
|---|---|
| "Flight provider is not configured" | Set `DUFFEL_ACCESS_TOKEN` in `backend/.env` (or the host's environment) and restart |
| Server exits: "is not a test token" | The token doesn't match `DUFFEL_MODE`; use a `duffel_test_…` token in test mode |
| "The flight provider rejected our credentials" | Token revoked or mistyped; create a new one |
| Searches take long | Offer requests query many airlines; up to ~20 s is normal. `DUFFEL_TIMEOUT_MS` sets the limit |
| "No flights found" | Test inventory is limited; try LHR → JFK, other dates, or Economy |
| "Date of birth gives age X…" | Child/infant ages chosen at search must match birth dates on the departure date — search again |
| "This offer has expired" | Offers expire (often within 30 minutes); search again |

## Database

| Symptom | Fix |
|---|---|
| `"database": "unavailable"` in `/api/health`, or `ECONNREFUSED` | Start PostgreSQL (`npm run db:up` or `docker compose up`) and check `DATABASE_URL` |
| pgAdmin/DBeaver: `password authentication failed for user "…"` | The client uses another project's login. Use `postgres` / `postgres`, database `flightbooking` ([details](database.md#connecting-a-database-client-pgadmin-dbeaver-tableplus-psql)) |
| Port 5432 already in use | Another PostgreSQL (Homebrew or another project's container) is running. Stop it, or change the host port in `docker-compose.yml` and `DATABASE_URL` |
| Tables missing | Run `npm run db:migrate` (Docker runs migrations automatically) |
| Start over with an empty database | `docker compose down -v`, then start again |

## Docker

| Symptom | Fix |
|---|---|
| Port 8080 in use | `FRONTEND_PORT=3000 docker compose up --build` |
| Frontend shows 502 for `/api` | Backend not running or unhealthy: `docker compose ps`, `docker compose logs backend` |
| Old container names after updating | `docker compose up --build --remove-orphans` (or `npm run docker:up`) |
| Changes not visible | Rebuild: `docker compose up --build` |

## Local development

| Symptom | Fix |
|---|---|
| Port 5000 in use (macOS) | AirPlay Receiver uses it: turn it off (System Settings → General → AirDrop & Handoff) or set `PORT=5050` in `backend/.env` **and** `VITE_API_BASE_URL=http://localhost:5050/api` in `frontend/.env` |
| "Cannot reach the server" in the UI | Backend not running, or `VITE_API_BASE_URL` / `FRONTEND_URL` don't match your ports (CORS) |
| `npm audit` shows moderate esbuild warnings | From `drizzle-kit`'s dev-only dependencies. Don't run `npm audit fix --force` — it downgrades drizzle-kit |

## GitHub and Render

| Symptom | Fix |
|---|---|
| Push rejected: "secret detected" | A real token is in a committed file (often `.env.example`). Remove it, amend the commit, push again — and consider rotating the token |
| Render didn't deploy after a push | CI failed (`autoDeployTrigger: checksPass`) — check the commit's GitHub Actions run |
| Render app slow on first request | Free instances sleep after 15 minutes idle |

More Render-specific checks: [Deploying to Render](deployment-render.md#troubleshooting-on-render).
