# SkyRoute documentation

SkyRoute is a flight search and booking web app. Travellers search flights from the airlines available through
[Duffel](https://duffel.com), compare and filter offers, enter passenger details and create a real Duffel airline
order (test mode by default). Guests retrieve bookings later with a private booking code.

## Contents

| Guide | What it covers |
|---|---|
| [Getting started](getting-started.md) | Run the project on your machine (npm or Docker), first search and test booking |
| [Architecture](architecture.md) | How the pieces fit together, folder structure, backend layers |
| [Booking flow](booking-flow.md) | Step-by-step from search to confirmed order, statuses, failure handling |
| [API reference](api-reference.md) | Every endpoint with request/response examples and error codes |
| [Database](database.md) | Tables, constraints, migrations, connecting a database client |
| [Duffel integration](duffel-integration.md) | Which Duffel APIs are used, test vs live mode, webhooks, what needs approval |
| [Frontend](frontend.md) | Pages, components, state, styling and accessibility |
| [Configuration](configuration.md) | All environment variables |
| [Docker](docker.md) | Images, build targets, docker compose, ports |
| [Deploying to Render](deployment-render.md) | Blueprint deploy, automatic deploys, environment, free-plan limits |
| [Security & privacy](security.md) | How secrets, personal data, payments and lookups are protected |
| [Testing](testing.md) | Test suite, what is covered, checks to run before merging |
| [Contributing](contributing.md) | Branch naming, commit messages, workflow |
| [Troubleshooting](troubleshooting.md) | Common problems and fixes |

## Tech stack

| Area | Technology |
|---|---|
| Frontend | Vue 3 (Composition API), TypeScript, Vite, Tailwind CSS 4, Vue Router, Axios, Lucide icons |
| Backend | Node.js, Express 5, TypeScript, Zod, Helmet, express-rate-limit |
| Database | PostgreSQL 17, Drizzle ORM, Drizzle Kit migrations |
| Flight provider | Duffel API v2 (offer requests, offers, orders, places, webhooks) |
| Tooling | npm workspaces, ESLint, Prettier, Vitest, supertest |
| Runtime | Docker (multi-stage images, nginx for the web app), Docker Compose, Render |

## At a glance

```
Browser ──▶ Vue app ──/api──▶ Express API ──HTTPS──▶ Duffel
                                  │
                                  └──▶ PostgreSQL (bookings, passengers, webhook events)
```

- A booking is **confirmed only after Duffel creates the airline order** — never just because a database row exists.
- Flight search results are not stored; only completed bookings (with an itinerary snapshot) are.
- Test mode is the default, and live bookings need two explicit settings.
