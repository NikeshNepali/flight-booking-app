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
| `refactor/` | Code changes without behaviour change | `refactor/booking-service` |

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `type(scope): summary`, imperative mood, summary under
about 72 characters, optional body explaining *why*.

```
feat(docker): print the app URL when the frontend container starts
fix(db): keep the API running when database connections drop
docs: add project documentation
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. Scopes used here: `backend`, `frontend`,
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

Make changes, then run the checks locally (there is no CI, so this is the only gate before Render deploys):

```bash
npm run lint && npm run typecheck && npm test
```

Push the branch and open a pull request into `main`:

```bash
git push -u origin feature/my-change
```

```bash
gh pr create --base main --fill
```

Merge the PR on GitHub (**Create a merge commit** keeps the branch history, like the
existing `Merge …` commits) or with:

```bash
gh pr merge --merge --delete-branch
```

Render deploys `main` automatically after the merge. Then update your local copy:

```bash
git checkout main && git pull
```

## Project conventions

- Backend: routes → controllers → services → repository/provider. Keep Duffel-specific code in
  `integrations/duffel/`.
- Validate all input with Zod; throw `AppError` for expected failures.
- Never log personal or payment data.
- Database changes: edit `backend/src/db/schema`, run `npm run db:generate`, review and commit the SQL migration.
- When the API changes, update `frontend/src/types/index.ts` and [API reference](api-reference.md).
- Add or update tests for business logic.
