# Security & privacy

> [!WARNING]
> This project was built with AI-assisted development and **has not had a human security review yet**. The measures
> below describe what was implemented, not a verified audit. A manual review (code, dependencies, infrastructure,
> penetration testing) still needs to be done and its findings reported before handling real users or payments.

## Secrets

- The Duffel token and webhook secret exist only on the server (`backend/.env`, or the host's environment variables).
  The frontend only knows the API URL.
- `.env` files are git-ignored and excluded from Docker images. `.env.example` files contain no real values (GitHub
  push protection blocks pushes containing Duffel tokens).
- Configuration is validated on start; a token that doesn't match the mode stops the server.

## Input validation

- Every request is validated with Zod on the server; the frontend repeats the same rules for instant feedback.
- JSON bodies are limited to 100 KB.
- All SQL goes through Drizzle with parameters — no string-built queries.

## HTTP hardening

- Helmet security headers, including a Content-Security-Policy (the nginx container sets an equivalent one).
- CORS allows only configured origins (`FRONTEND_URL`, plus the Render URL).
- Rate limits on every public endpoint (see [API reference](api-reference.md#rate-limits-per-ip)); `trust proxy` is set
  for correct client IPs behind Render or nginx.
- `x-powered-by` is disabled; nginx hides its version.

## Personal data

- Stored: contact email/phone, passenger names, titles, dates of birth, passenger types — what's needed to manage the
  booking.
- **Not stored**: passport details (sent to Duffel only when the airline requires them), card data (never collected),
  search results.
- Logs contain ids, status codes and error codes — never names, contact details, documents or payment data.
- In the browser, passenger details live in memory only and are cleared after booking.

## Booking lookup

- Each booking gets a 256-bit random token (43 characters, base64url). Only its SHA-256 hash is stored, with a unique
  index.
- Bookings can't be retrieved by id, email or name, so they can't be guessed or enumerated.
- Lookup is a `POST` with the token in the body and `Cache-Control: no-store`, so the token stays out of URLs, logs and
  caches. Private links use a URL fragment (`#code=…`), which browsers never send to servers.
- Lookups are rate limited.

## Payments and duplicate bookings

- No card collection or storage. Test mode pays with Duffel's test balance.
- Idempotency keys (unique in the database) make retries and double clicks safe; the Book button is disabled while
  processing.
- The offer is re-priced right before booking; the user must accept a changed total.
- Outcomes that can't be confirmed (timeouts) stay `pending` and the user is told not to rebook.
- Live bookings require two explicit settings and a live token.

## Webhooks

- HMAC-SHA256 signature verification with constant-time comparison and a 5-minute replay window.
- Events are de-duplicated by id, and the order is re-fetched from Duffel instead of trusting the payload.

## Containers

- Node containers run as the non-root `node` user; images contain only production dependencies.
- The database is published on `localhost:5432` for local tools only; on Render it's reachable only over the private
  network.

## Not included (consider for production)

User accounts, email verification, audit logging, automated data retention/deletion, and a WAF/CDN in front of the app.
