#!/bin/sh
# Runs when the frontend container starts (the nginx image executes /docker-entrypoint.d/*.sh
# before starting nginx) and prints where to open the app.
URL="${APP_URL:-http://localhost:8080}"

cat <<BANNER

  ==========================================================
    SkyRoute is running

    Open the app:      ${URL}
    API health check:  ${URL}/api/health
  ==========================================================

BANNER
