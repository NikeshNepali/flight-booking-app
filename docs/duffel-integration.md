# Duffel integration

All Duffel code is in `backend/src/integrations/duffel/`:

| File | Purpose |
|---|---|
| `duffel.client.ts` | Minimal HTTP client: base URL, `Duffel-Version: v2` header, bearer token, timeouts, error parsing |
| `duffel.types.ts` | The subset of Duffel's response shapes the app uses |
| `duffel.mappers.ts` | Converts Duffel JSON into the app's own types; offer de-duplication |
| `duffel.service.ts` | `DuffelFlightProvider` (implements `FlightProvider`) and error translation |
| `index.ts` | Creates the app-wide provider instance from environment variables |

Official guide: <https://duffel.com/docs/guides/getting-started-with-flights>

## Duffel endpoints used

| App feature | Duffel request |
|---|---|
| Airport autocomplete | `GET /places/suggestions?query=…` |
| Search | `POST /air/offer_requests?return_offers=false&supplier_timeout=20000` with slices, passengers, `cabin_class`, `max_connections` |
| Results and "load more" | `GET /air/offers?offer_request_id=…&sort=total_amount&limit=50&after=…` |
| Details / re-pricing | `GET /air/offers/:id?return_available_services=false` |
| Booking | `POST /air/orders` |
| Lookup refresh, webhooks | `GET /air/orders/:id` |

### Passengers in search

Adults are sent as `{ "type": "adult" }`. Children and infants are sent as `{ "age": n }`, and Duffel derives the
passenger type (`child`, `infant_without_seat`). That's why the search form asks for ages.

### Order request

```json
{
  "data": {
    "type": "instant",
    "selected_offers": ["off_…"],
    "passengers": [{
      "id": "pas_…", "title": "ms", "gender": "f", "given_name": "Amelia", "family_name": "Earhart",
      "born_on": "1987-07-24", "email": "traveller@example.com", "phone_number": "+442080160509",
      "infant_passenger_id": "pas_… (adults travelling with an infant)",
      "identity_documents": [{ "type": "passport", "unique_identifier": "…", "issuing_country_code": "GB", "expires_on": "…" }]
    }],
    "payments": [{ "type": "balance", "currency": "GBP", "amount": "450.20" }],
    "metadata": { "booking_id": "<our booking uuid>" }
  }
}
```

- Each infant is linked to a different adult (`infant_passenger_id`).
- `identity_documents` is only sent when the offer says documents are required.
- `metadata.booking_id` lets a webhook match an order to our booking even if the API call timed out.

## Mapping notes

- Times (`departing_at`, `arriving_at`) are **local to the airport** without an offset. The UI shows them as-is with
  the airport's time-zone abbreviation; layovers are computed between times at the same airport.
- ISO 8601 durations (`PT7H25M`, `P1DT2H`) become minutes.
- Baggage and cabin come from the first passenger with baggage on each segment.
- Missing conditions stay `null` and are shown as "not provided by the airline".
- E-ticket numbers come from order `documents` of type `electronic_ticket`.

## Error handling

Duffel errors are translated in `toAppError()`:

| Duffel response | App error |
|---|---|
| 401 / 403 | `503 CONFIG_ERROR` (bad token) |
| 429 | `429 RATE_LIMITED` |
| `offer_no_longer_available`, `offer_expired`, `not_found` | `410 OFFER_EXPIRED` |
| `price_changed` | `409 PRICE_CHANGED` |
| `insufficient_balance`, payment errors | `402 PAYMENT_FAILED` |
| validation errors (400/422) | `422 VALIDATION_ERROR` with Duffel's message |
| 5xx | `502 PROVIDER_UNAVAILABLE`, marked **uncertain** |
| timeout / network error | `504 PROVIDER_TIMEOUT` or `PROVIDER_UNAVAILABLE`, marked **uncertain** |

"Uncertain" errors during order creation leave the booking `pending` instead of `failed`, because Duffel may have
created the order. See [Booking flow](booking-flow.md#when-things-go-wrong).

Timeouts: `DUFFEL_TIMEOUT_MS` (default 30 s) for most calls, 10 s for place suggestions, 90 s for order creation.

## Test mode and live mode

| | Test (default) | Live |
|---|---|---|
| Token prefix | `duffel_test_` | `duffel_live_` |
| `DUFFEL_MODE` | `test` | `live` |
| Bookings allowed | yes | only if `DUFFEL_LIVE_BOOKINGS_ENABLED=true` |
| Payment | Duffel test balance | your real Duffel balance |
| Tickets | not real | real |

Safety rails:

1. The server **refuses to start** if the token prefix doesn't match `DUFFEL_MODE`.
2. Every offer request, offer and order response's `live_mode` is checked against the configured mode.
3. Live bookings need a second explicit switch.
4. Without a token the app shows a configuration error — it never shows made-up data.

## Webhooks

Endpoint: `POST /api/webhooks/duffel`.

1. Verify `X-Duffel-Signature: t=<timestamp>,v1=<signature>`: HMAC-SHA256 of `"<t>.<raw body>"` with
   `DUFFEL_WEBHOOK_SECRET`, compared in constant time; timestamps older than 5 minutes are rejected.
2. Ignore events whose `live_mode` doesn't match the app's mode.
3. Skip events already recorded in `booking_events` (de-duplication).
4. For `order.*` events, **fetch the order from Duffel** and update the matching booking (by order id, or by
   `metadata.booking_id`): confirmed/cancelled, tickets, payment status.
5. Record the event id.

Setting up: Duffel dashboard → Developers → Webhooks → add `https://<your-app>/api/webhooks/duffel`, subscribe to
order events, and put the secret into `DUFFEL_WEBHOOK_SECRET`. Locally you need a tunnel such as `ngrok http 5000`.

## What needs a Duffel account or approval

| Item | Status |
|---|---|
| Test token | Required for search and booking. Free and self-serve |
| Test bookings | Fully implemented |
| Live mode | Duffel must activate your organisation for live access |
| Charging travellers | Not included. Orders are paid from **your Duffel balance**. Collecting money from travellers needs Duffel Payments (card component with 3-D Secure, enabled on your account) or another PCI-compliant payment provider that charges the customer before the order is created |
| Hold orders / pay later | Not implemented (all orders are `instant`) |
| Emails / e-ticket delivery | Not included |
| Selling to the public | Usually requires travel-seller licensing for your country, your own terms and privacy policy |
