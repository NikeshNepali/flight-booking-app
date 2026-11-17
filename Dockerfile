# syntax=docker/dockerfile:1
# One image = API + built web app (Express serves the Vue build from the same origin).
# Used by Render (runtime: docker) and by `docker compose --profile app up`.

ARG NODE_VERSION=22-alpine

# ---- 1. Install all dependencies and build both workspaces ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --no-audit --no-fund

COPY backend backend
COPY frontend frontend
# The browser calls the API on the same origin, so a relative URL is enough.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -w backend && npm run build -w frontend

# ---- 2. Production-only dependencies for the backend ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false --no-audit --no-fund

# ---- 3. Small runtime image ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=10000 \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node backend/package.json backend/
COPY --from=build --chown=node:node /app/backend/dist backend/dist
COPY --from=build --chown=node:node /app/backend/src/db/migrations backend/dist/db/migrations
COPY --from=build --chown=node:node /app/frontend/dist frontend/dist

USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

# Apply pending migrations, then start the API. If migrations fail, the container exits
# and Render keeps the previous deploy running.
WORKDIR /app/backend
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
