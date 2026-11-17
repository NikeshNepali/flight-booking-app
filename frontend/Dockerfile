# syntax=docker/dockerfile:1
# Web app container: builds the Vue app and serves it with nginx, which also forwards
# /api requests to the backend container. Build from the repository root:
#   docker build -f frontend/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace frontend --include-workspace-root=false --no-audit --no-fund
COPY frontend frontend
# Same-origin API calls; nginx proxies /api to the backend.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
# Prints the app URL in the container logs on start.
COPY --chmod=755 frontend/docker-entrypoint.sh /docker-entrypoint.d/99-print-app-url.sh
ENV APP_URL=http://localhost:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
