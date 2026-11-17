# Deploying to Render

The repository includes a [Render Blueprint](https://render.com/docs/blueprint-spec) (`render.yaml`) that creates
everything in one go:

| Resource | Type | Details |
|---|---|---|
| `skyroute` | Docker web service | Root `Dockerfile` (default target): API + web app in one container, health check `/api/health` |
| `skyroute-db` | Render PostgreSQL 17 | Connected through `DATABASE_URL` over Render's private network |

On every start the container applies pending migrations and then starts the server. If a migration fails, the
container exits and Render keeps the previous deploy live.

## Prerequisites

- The code pushed to GitHub (this repository).
- A Render account connected to GitHub.
- A Duffel **test** token (`duffel_test_…`).

## Deploy

1. Render dashboard → **New → Blueprint**.
2. Select the `flight-booking-app` repository and the `main` branch. Render reads `render.yaml` and lists the web
   service and the database.
3. Fill in the values it asks for:
   - `DUFFEL_ACCESS_TOKEN` — your `duffel_test_…` token
   - `DUFFEL_WEBHOOK_SECRET` — leave empty for now (optional)
4. Click **Apply**. The database is created, the image is built (a few minutes the first time), and the service starts.
5. Open the service URL (`https://skyroute-xxxx.onrender.com`) and check `https://skyroute-xxxx.onrender.com/api/health`:

   ```json
   { "success": true, "data": { "status": "ok", "database": "ok", "provider": { "mode": "test", "configured": true } } }
   ```

## Automatic deploys

`render.yaml` sets `autoDeployTrigger: commit`: every commit merged into `main` is deployed automatically. There is no
CI gate, so run the checks locally before merging (see [Testing](testing.md#before-merging)). You can also deploy
manually from the dashboard (**Manual Deploy**).

Other option: `off` (deploy only manually).

## Environment variables

| Variable | Set by | Value |
|---|---|---|
| `DATABASE_URL` | Blueprint | From `skyroute-db` (internal connection string) |
| `DUFFEL_ACCESS_TOKEN` | You (prompted once) | `duffel_test_…` |
| `DUFFEL_MODE` | Blueprint | `test` |
| `DUFFEL_LIVE_BOOKINGS_ENABLED` | Blueprint | `false` |
| `DUFFEL_WEBHOOK_SECRET` | You | Optional, from Duffel's webhook settings |
| `DUFFEL_TIMEOUT_MS` | Blueprint | `30000` |
| `FRONTEND_URL` | Blueprint | Empty — only needed for extra origins |
| `PORT`, `RENDER_EXTERNAL_URL` | Render | Set automatically; the app listens on `PORT` (10000) and allows `RENDER_EXTERNAL_URL` for CORS |
| `NODE_ENV`, `FRONTEND_DIST` | Docker image | `production`, `/app/frontend/dist` |

`sync: false` values are only prompted when the Blueprint is first applied. To change them later, use the service's
**Environment** tab; the service restarts automatically.

## Webhooks (optional)

1. Duffel dashboard → Developers → Webhooks → add `https://<your-service>.onrender.com/api/webhooks/duffel` and
   subscribe to order events.
2. Copy the webhook secret into `DUFFEL_WEBHOOK_SECRET` on Render.

Without webhooks, bookings still work; booking lookups refresh the order from Duffel at most once a minute.

## Free-plan limits

| Limit | Effect | Fix |
|---|---|---|
| Free web services **spin down after 15 minutes** without traffic | The next visit takes about a minute | Use a paid instance type (`plan:` in `render.yaml`) |
| Free PostgreSQL **expires 30 days after creation** (14-day grace period), 1 GB, no backups | Data is deleted after expiry | Upgrade the database plan before then |
| Only **one free PostgreSQL per workspace** | A second Blueprint with a free database fails | Reuse/delete the old one or use a paid plan |
| No pre-deploy command on free plans | — | Not needed: migrations run on container start |

`region` and the database `name`, `databaseName`, `user` and `postgresMajorVersion` can't be changed after creation.

## Custom domain

Service → **Settings → Custom Domains**, add your domain and follow Render's DNS instructions. Then add the domain to
`FRONTEND_URL` (e.g. `https://flights.example.com`) so CORS allows it.

## Going live with real bookings

Don't switch to live mode until you've read [Duffel integration → What needs a Duffel account or approval](duffel-integration.md#what-needs-a-duffel-account-or-approval).
Live mode requires a `duffel_live_…` token, `DUFFEL_MODE=live` and `DUFFEL_LIVE_BOOKINGS_ENABLED=true`. Orders are then
paid from your real Duffel balance, and travellers are **not** charged by this app.

## Troubleshooting on Render

| Symptom | Check |
|---|---|
| Deploy didn't start after a push | The change wasn't merged into `main`, or auto-deploy is turned off for the service |
| Build fails | The Render build log; run `docker build .` locally to reproduce |
| Deploy fails right after "Database migrations…" | The migration error in the logs; the previous deploy stays live |
| "Service unavailable" for ~1 minute | Free instance waking up |
| `"configured": false` in `/api/health` | Set `DUFFEL_ACCESS_TOKEN` in the Environment tab |
| Server exits with "is not a test token" | Token prefix doesn't match `DUFFEL_MODE` |
| `"database": "unavailable"` | Database suspended/expired (free plan), or `DATABASE_URL` changed |
