# Contributing

## Branches

`main` always holds working, deployable code (Render deploys it). Work happens on short-lived branches named
`<type>/<short-description>` in lowercase kebab-case:

| Prefix | Use for | Example |
|---|---|---|
| `feature/` | New functionality | `feature/frontend-startup-url` |
| `fix/` | Bug fixes | `fix/db-reconnect` |
| `docs/` | Documentation only | `docs/project-documentation` |
| `chore/` | Tooling, dependencies, config | `chore/update-dependencies` |
| `ci/` | CI/CD changes | `ci/cache-docker-layers` |
| `refactor/` | Code changes without behaviour change | `refactor/booking-service` |

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, imperative mood, summary under
about 72 characters, optional body explaining *why*.

```
feat(docker): print the app URL when the frontend container starts
fix(db): keep the API running when database connections drop
docs: add project documentation
```

Common types: `feat`, `fix`, `docs`, `chore`, `ci`, `refactor`, `test`. Scopes used here: `backend`, `frontend`,
`database`, `bookings`, `docker`, `deploy`, `db`.

## Workflow

```bash
git checkout main
```

```bash
git pull
```

```bash
git checkout -b feature/my-change
```

Make changes, then run the checks:

```bash
npm run lint && npm run typecheck && npm test
```

```bash
git push -u origin feature/my-change
```

Open a pull request into `main` (or merge with `git merge --no-ff`). CI must pass before merging; Render deploys `main`
after the checks pass.

## Project conventions

- Backend: routes → controllers → services → repository/provider. Keep Duffel-specific code in
  `integrations/duffel/`.
- Validate all input with Zod; throw `AppError` for expected failures.
- Never log personal or payment data.
- Database changes: edit `backend/src/db/schema`, run `npm run db:generate`, review and commit the SQL migration.
- When the API changes, update `frontend/src/types/index.ts` and [API reference](api-reference.md).
- Add or update tests for business logic.
