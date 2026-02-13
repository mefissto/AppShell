#!/usr/bin/env bash
set -euo pipefail

# E2E setup script
# - Forces NODE_ENV=e2e so the app loads .env.e2e
# - Runs Prisma migrations against the e2e database

export NODE_ENV=e2e

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set. Check .env.e2e." >&2
  exit 1
fi

echo "Applying Prisma migrations to the e2e database..."

npx prisma migrate deploy
