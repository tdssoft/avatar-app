#!/usr/bin/env sh
set -eu

TEMPLATE="/home/kong/kong.yml.template"
OUT="/home/kong/kong.yml"

# Render required values from env into the declarative Kong config.
# Keep this list explicit to avoid accidentally leaking other env vars.
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?missing SUPABASE_ANON_KEY}"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:?missing SUPABASE_SERVICE_KEY}"
export DASHBOARD_USERNAME="${DASHBOARD_USERNAME:?missing DASHBOARD_USERNAME}"
export DASHBOARD_PASSWORD="${DASHBOARD_PASSWORD:?missing DASHBOARD_PASSWORD}"

envsubst '$SUPABASE_ANON_KEY $SUPABASE_SERVICE_KEY $DASHBOARD_USERNAME $DASHBOARD_PASSWORD' \
  < "$TEMPLATE" > "$OUT"

exec /docker-entrypoint.sh "$@"

