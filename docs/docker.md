# Docker

## Images

| Image | Dockerfile | Contents | Used by |
|---|---|---|---|
| All-in-one (default target `app`) | `Dockerfile` | API + built web app, served from one origin | Render |
| API only (target `api`) | `Dockerfile` | Express API | docker compose `backend` |
| Web app | `frontend/Dockerfile` | Vue build served by nginx, `/api` proxied to `backend` | docker compose `frontend` |

All images are multi-stage: dependencies are installed and the apps built in throwaway stages, and the final images
contain only what's needed to run. Node images run as the non-root `node` user and have a `HEALTHCHECK` on
`/api/health`.

### Root `Dockerfile` stages

```
deps-all ──┬─▶ build-backend ──┐
           └─▶ build-frontend ─┼─▶ app (default)
deps-prod ─────────────────────┴─▶ api ──┘
```

- `api` copies production `node_modules`, the compiled backend and the migrations.
- `app` = `api` + the built web app and `FRONTEND_DIST=/app/frontend/dist`.
- On start: `node dist/db/migrate.js && exec node dist/server.js` — migrations first, then the server.

Build manually:

```bash
docker build -t skyroute .                      # all-in-one (Render)
```

```bash
docker build --target api -t skyroute-api .     # API only
```

```bash
docker build -f frontend/Dockerfile -t skyroute-web .
```

### `frontend/Dockerfile`

Builds the Vue app with `VITE_API_BASE_URL=/api`, then serves it with `nginx:alpine` using `frontend/nginx.conf`:

- `/api/*` → `http://backend:10000` (120 s read timeout for slow airline bookings)
- `/assets/*` → cached for a year (file names contain content hashes)
- everything else → `index.html` (Vue Router history mode)
- security headers including a Content-Security-Policy that allows Duffel's airline logo CDN
- `frontend/docker-entrypoint.sh` prints the app URL when the container starts

## docker compose

```bash
docker compose up --build
```

| Service | Port | Notes |
|---|---|---|
| `postgres` | `localhost:5432` | User/password `postgres`/`postgres`, database `flightbooking`, data in the `pgdata` volume |
| `backend` | internal `10000` | Waits for a healthy database, applies migrations, reads `DUFFEL_*` from `backend/.env` |
| `frontend` | `localhost:8080` (`FRONTEND_PORT`) | Waits for a healthy backend, prints the URL on start |

All services use `restart: unless-stopped`, and the backend reconnects by itself if the database restarts.

Common commands:

| Command | What it does |
|---|---|
| `docker compose up --build` | Build and run everything in the foreground |
| `npm run docker:up` | Same, in the background; waits until healthy and prints the URL |
| `npm run docker:logs` | Follow logs |
| `docker compose ps` | Container status and health |
| `docker compose down` | Stop and remove containers (data kept) |
| `docker compose down -v` | Also delete the database volume |
| `npm run db:up` | Start **only** PostgreSQL (for npm development mode) |
| `FRONTEND_PORT=3000 docker compose up --build` | Use another host port |

## `.dockerignore`

Keeps `node_modules`, build output, `.env` files and git data out of the build context, so local secrets never end up
in an image.
