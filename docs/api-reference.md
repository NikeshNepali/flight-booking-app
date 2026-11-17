# API reference

Base URL: `http://localhost:5000/api` (npm), `http://localhost:8080/api` (Docker) or `https://<your-app>.onrender.com/api`.

## Conventions

All responses are JSON.

```jsonc
// success
{ "success": true, "data": { /* … */ } }

// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Some fields are invalid.", "details": { /* optional */ } } }
```

Validation errors list the fields:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields are invalid.",
    "details": { "fields": [{ "path": "departureDate", "message": "Must be a valid date (YYYY-MM-DD)" }] }
  }
}
```

Request bodies are limited to 100 KB. Unknown routes return `404 NOT_FOUND`.

## Rate limits (per IP)

| Scope | Limit |
|---|---|
| All `/api` routes | 600 requests / 15 min |
| `GET /airports` | 120 / min |
| Flight search and "load more" | 20 / min |
| `POST /bookings` | 10 / 15 min |
| `POST /bookings/lookup` | 30 / 15 min |

Exceeding a limit returns `429 RATE_LIMITED` with standard `RateLimit` headers.

---

## `GET /health`

Server, database and provider status. Used by Docker and Render health checks.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "ok",
    "provider": { "name": "duffel", "mode": "test", "configured": true, "bookingsEnabled": true, "webhooksConfigured": false }
  }
}
```

`database` is `"unavailable"` when PostgreSQL can't be reached.

## `GET /airports?query=London`

Airport and city suggestions (Duffel Places). `query`: 2–60 characters.

```json
{
  "success": true,
  "data": [
    {
      "type": "city", "iataCode": "LON", "name": "London", "cityName": "London", "countryCode": "GB", "timeZone": null,
      "airports": [{ "type": "airport", "iataCode": "LHR", "name": "Heathrow", "cityName": "London", "countryCode": "GB", "timeZone": "Europe/London" }]
    }
  ]
}
```

## `POST /flights/search`

```json
{
  "origin": "LHR",
  "destination": "JFK",
  "departureDate": "2027-03-15",
  "returnDate": "2027-03-22",
  "adults": 2,
  "childAges": [8],
  "infantAges": [1],
  "cabinClass": "economy",
  "maxConnections": 1
}
```

| Field | Rules |
|---|---|
| `origin`, `destination` | 3-letter IATA codes, different from each other |
| `departureDate` | `YYYY-MM-DD`, not in the past, within 360 days |
| `returnDate` | optional, on or after `departureDate` |
| `adults` | 1–9 |
| `childAges` | optional, ages 2–17 |
| `infantAges` | optional, ages 0–1, no more than `adults` |
| `cabinClass` | `economy` (default), `premium_economy`, `business`, `first` |
| `maxConnections` | optional, 0–2 (Duffel default 1) |

Total passengers ≤ 9. Response:

```json
{
  "success": true,
  "data": {
    "offerRequestId": "orq_…",
    "nextCursor": "g3QAAAAB…",
    "offers": [ /* FlightOffer, see below */ ]
  }
}
```

## `GET /flights/offer-requests/:offerRequestId/offers?after=<cursor>`

Next page of offers for the same search. Same response shape. `nextCursor` is `null` on the last page.

## `GET /flights/offers/:offerId`

Latest price and availability for one offer (always fetched live from Duffel). Errors: `410 OFFER_EXPIRED`.

### FlightOffer

```jsonc
{
  "id": "off_…",
  "totalAmount": "450.20", "totalCurrency": "GBP",
  "baseAmount": "380.00", "taxAmount": "70.20",
  "expiresAt": "2026-11-17T10:00:00Z",
  "owner": { "name": "Duffel Airways", "iataCode": "ZZ", "logoUrl": "https://assets.duffel.com/…" },
  "slices": [{
    "origin": { "iataCode": "LHR", "name": "Heathrow", "cityName": "London", "timeZone": "Europe/London" },
    "destination": { "iataCode": "JFK", "…": "…" },
    "departingAt": "2027-03-15T08:00:00",          // local time at the airport, no offset
    "arrivingAt": "2027-03-15T13:45:00",
    "durationMinutes": 645, "stops": 1,
    "connections": [{ "airport": { "iataCode": "DUB", "…": "…" }, "durationMinutes": 105 }],
    "fareBrandName": "Basic",
    "segments": [{
      "flightNumber": "ZZ101", "marketingCarrier": { "…": "…" }, "operatingCarrier": { "…": "…" },
      "aircraft": "Airbus A320", "cabinClass": "economy", "cabinMarketingName": "Economy",
      "baggage": [{ "type": "checked", "quantity": 1 }, { "type": "carry_on", "quantity": 1 }]
    }]
  }],
  "passengers": [{ "id": "pas_…", "type": "adult", "age": null }],
  "conditions": {
    "refundBeforeDeparture": { "allowed": false, "penaltyAmount": null, "penaltyCurrency": null },
    "changeBeforeDeparture": { "allowed": true, "penaltyAmount": "50.00", "penaltyCurrency": "GBP" }
  },
  "identityDocumentsRequired": false,
  "liveMode": false
}
```

A condition of `null` means the airline did not say — the app never guesses.

## `POST /bookings`

Creates a real Duffel order (test mode by default). Idempotent per `idempotencyKey`.

```json
{
  "idempotencyKey": "3b241101-e2bb-4255-8caf-4136c566a962",
  "offerId": "off_…",
  "expectedTotal": { "amount": "450.20", "currency": "GBP" },
  "acceptedConditions": true,
  "contact": { "email": "traveller@example.com", "phone": "+442080160509" },
  "passengers": [
    {
      "id": "pas_…",
      "title": "ms",
      "gender": "f",
      "givenName": "Amelia",
      "familyName": "Earhart",
      "bornOn": "1987-07-24",
      "identityDocument": { "type": "passport", "uniqueIdentifier": "AB12345", "issuingCountryCode": "GB", "expiresOn": "2030-01-01" }
    }
  ]
}
```

- `idempotencyKey`: a UUID generated by the client once per checkout attempt. Retrying with the same key never creates a
  second order.
- `passengers[].id`: the passenger ids from the offer — every offer passenger exactly once.
- `title`: `mr`, `ms`, `mrs`, `miss`, `dr`. `gender`: `m`, `f`. `phone`: E.164 (`+` and digits).
- `identityDocument`: only when the offer has `identityDocumentsRequired: true`; otherwise it is dropped.

Responses:

| Status | Meaning |
|---|---|
| `201` | Order created and confirmed by Duffel |
| `202` | Outcome not known yet (timeout). Booking is `pending`; do not book again |
| `403 BOOKINGS_DISABLED` | Live mode without the explicit switch |
| `409 PRICE_CHANGED` | `details: { totalAmount, totalCurrency }` — confirm the new price and retry with a new key |
| `410 OFFER_EXPIRED` | Search again |
| `422 INVALID_PASSENGERS` | `details.problems: [{ passengerId, field, message }]` |
| `402 PAYMENT_FAILED`, `422 VALIDATION_ERROR`, `502 PROVIDER_ERROR` | Rejected by Duffel; booking marked `failed` |

Success body (`BookingView`):

```jsonc
{
  "status": "confirmed",
  "ticketingStatus": "not_issued",
  "paymentStatus": "paid",
  "provider": "duffel",
  "providerOrderId": "ord_…",
  "bookingReference": "RZPNX8",
  "totalAmount": "450.20", "currency": "GBP",
  "liveMode": false,
  "contactEmail": "traveller@example.com",
  "createdAt": "…", "updatedAt": "…",
  "itinerary": { "owner": { "…": "…" }, "slices": [ /* … */ ], "conditions": { "…": "…" }, "tickets": [] },
  "passengers": [{ "providerPassengerId": "pas_…", "title": "ms", "givenName": "Amelia", "familyName": "Earhart",
                   "dateOfBirth": "1987-07-24", "passengerType": "adult", "ticketNumbers": [] }],
  "failure": null,
  "lookupToken": "7t_dpyNd-XErLdWjS9lbAtkaPseeWCbydnd1HqXgE94"   // only in this response
}
```

## `POST /bookings/lookup`

```json
{ "token": "7t_dpyNd-XErLdWjS9lbAtkaPseeWCbydnd1HqXgE94" }
```

Returns a `BookingView` (without `lookupToken`). Unknown token → `404 NOT_FOUND`. Responses are `Cache-Control: no-store`.
It is a `POST` so the token never appears in URLs or access logs.

## `POST /webhooks/duffel`

Called by Duffel, not by browsers. Requires header `X-Duffel-Signature: t=<unix>,v1=<hex>`.

- `401 INVALID_SIGNATURE` for a bad or old (> 5 min) signature.
- `503 CONFIG_ERROR` if `DUFFEL_WEBHOOK_SECRET` is not set.
- `200 { "received": true }`, or `{ "received": true, "duplicate": true }` for an event already processed.

See [Duffel integration](duffel-integration.md#webhooks).

## Error codes

| Code | Typical status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 / 422 | Invalid input (ours or rejected by Duffel) |
| `NOT_FOUND` | 404 | Route, booking or provider item not found |
| `CONFIG_ERROR` | 503 | Duffel token or webhook secret missing/invalid |
| `RATE_LIMITED` | 429 | Too many requests (ours or Duffel's) |
| `PROVIDER_ERROR` | 502 | Duffel returned an unexpected error |
| `PROVIDER_TIMEOUT` | 504 | Duffel did not answer in time |
| `PROVIDER_UNAVAILABLE` | 502 / 504 | Duffel unreachable or 5xx |
| `OFFER_EXPIRED` | 410 | Offer no longer available |
| `PRICE_CHANGED` | 409 | Total differs from `expectedTotal` |
| `INVALID_PASSENGERS` | 422 | Passenger details don't fit the offer |
| `PAYMENT_FAILED` | 402 | Payment rejected (e.g. insufficient balance) |
| `BOOKING_FAILED` | 409 | Replay of an attempt that failed earlier |
| `BOOKING_IN_PROGRESS` | 409 | Identical request is being processed |
| `BOOKINGS_DISABLED` | 403 | Live bookings not enabled |
| `INVALID_SIGNATURE` | 401 | Webhook signature check failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
