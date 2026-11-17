# Configuration

## Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`. Values are validated on start (`backend/src/config/env.ts`); invalid
configuration stops the server with a clear message.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` (`10000` in Docker) | Port the API listens on |
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `DATABASE_SSL` | `false` | `true` for external databases that require TLS (not needed for Render's internal URL) |
| `DUFFEL_ACCESS_TOKEN` | empty | Duffel token. Empty = search/booking return a configuration error |
| `DUFFEL_MODE` | `test` | `test` or `live`; must match the token prefix or the server won't start |
| `DUFFEL_LIVE_BOOKINGS_ENABLED` | `false` | Must be `true` (with `DUFFEL_MODE=live`) to create real orders |
| `DUFFEL_WEBHOOK_SECRET` | empty | Secret for verifying Duffel webhooks |
| `DUFFEL_TIMEOUT_MS` | `30000` | Duffel request timeout (1000–120000) |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed browser origin(s) for CORS, comma-separated |
| `FRONTEND_DIST` | empty | Folder of the built web app; when set, the API also serves it (set in the all-in-one image) |
| `RENDER_EXTERNAL_URL` | set by Render | Added to the allowed origins automatically |

## Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | Where the browser sends API calls. Docker images build with `/api` |

`VITE_*` values are compiled into the public JavaScript bundle. Don't put secrets in them.

## Docker Compose

| Variable | Default | Description |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Host port for the web app, e.g. `FRONTEND_PORT=3000 docker compose up` |

The `backend` container reads `backend/.env` for the `DUFFEL_*` settings; compose overrides `DATABASE_URL`, `PORT`,
`NODE_ENV` and `FRONTEND_URL` so they point at the containers.

## Render

Set in `render.yaml` or the service's **Environment** tab. See [Deploying to Render](deployment-render.md#environment-variables).
