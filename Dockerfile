# syntax=docker/dockerfile:1
# Build targets:
#   app (default) – API + built web app in ONE container. Used by Render (render.yaml).
#   api           – API only. Used by docker-compose, where the web app runs in its own
#                   nginx container (see frontend/Dockerfile).

ARG NODE_VERSION=22-alpine

# ---- 1. Install all dependencies ----
FROM node:${NODE_VERSION} AS deps-all
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --no-audit --no-fund

# ---- 2a. Build the backend ----
FROM deps-all AS build-backend
COPY backend backend
RUN npm run build -w backend

# ---- 2b. Build the frontend ----
FROM deps-all AS build-frontend
COPY frontend frontend
# The browser calls the API on the same origin, so a relative URL is enough.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -w frontend

# ---- 3. Production-only dependencies for the backend ----
FROM node:${NODE_VERSION} AS deps-prod
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false --no-audit --no-fund

# ---- 4. API runtime image ----
FROM node:${NODE_VERSION} AS api
ENV NODE_ENV=production \
    PORT=10000
WORKDIR /app

COPY --from=deps-prod --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node backend/package.json backend/
COPY --from=build-backend --chown=node:node /app/backend/dist backend/dist
COPY --from=build-backend --chown=node:node /app/backend/src/db/migrations backend/dist/db/migrations

USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

# Apply pending migrations, then start the API. If migrations fail, the container exits
# and Render keeps the previous deploy running.
WORKDIR /app/backend
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]

# ---- 5. All-in-one image (default target): API also serves the web app ----
FROM api AS app
ENV FRONTEND_DIST=/app/frontend/dist
COPY --from=build-frontend --chown=node:node /app/frontend/dist /app/frontend/dist
