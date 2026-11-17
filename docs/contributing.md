# Contributing

## Protected `main`

`main` always holds working, deployable code (Render deploys it), so it is protected on GitHub:

| Rule | Effect |
|---|---|
| Pull request required | No direct pushes to `main` — every change goes through a PR |
| Required checks: `Lint, typecheck, test, build` and `Docker images build` | A PR can only be merged when CI passes |
| Branch must be up to date | If `main` moved on, update the PR branch (GitHub's **Update branch** button) and let CI run again |
| Conversations resolved | All review comments must be resolved before merging |
| No force pushes, no deletion | `main`'s history can't be rewritten or removed |
| Applies to admins | The rules apply to the repository owner too |
| Approvals required: 0 | Solo-friendly (you can't approve your own PR). Raise it in **Settings → Branches** when collaborators join |

## Branches

Work happens on short-lived branches named
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

Make changes, then run the checks locally:

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

When both CI checks are green, merge the PR on GitHub (**Create a merge commit** keeps the branch history, like the
existing `Merge …` commits) or with:

```bash
gh pr merge --merge --delete-branch
```

Render deploys `main` after the checks pass on the merge commit. Then update your local copy:

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
