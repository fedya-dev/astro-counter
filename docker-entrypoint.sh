#!/bin/bash
# docker-entrypoint.sh
# Runs on container startup. Responsibilities:
# 1. Apply the Prisma schema to the SQLite DB (creates/updates tables).
# 2. Start the Next.js server.
set -euo pipefail

# Default values for env vars (can be overridden at runtime)
export DATABASE_URL="${DATABASE_URL:-file:/app/data/custom.db}"
export ADMIN_PIN="${ADMIN_PIN:-1234}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
# NEXT_PUBLIC_BASE_URL is only used at BUILD time for the snippet generation;
# at runtime we detect the origin from request headers (see detectPublicOrigin).

echo "================================================"
echo "  Astro Visitor Counter — starting up"
echo "================================================"
echo "  Database: $DATABASE_URL"
echo "  Admin PIN: configured ($([ ${#ADMIN_PIN} -ge 4 ] && echo 'yes' || echo 'NO — set ADMIN_PIN env var!'))"
echo "  Port: $PORT"
echo "================================================"

# Make sure the data directory exists and is writable
mkdir -p "$(dirname "$(echo "$DATABASE_URL" | sed 's/^file://')")" 2>/dev/null || true

# Apply the Prisma schema — creates tables if they don't exist, no data loss.
echo "[entrypoint] Applying Prisma schema to database..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate || {
    echo "[entrypoint] WARNING: prisma db push failed. Continuing anyway — the runtime will create tables lazily."
}

# Start the Next.js standalone server
echo "[entrypoint] Starting Next.js server on $HOSTNAME:$PORT..."
exec node server.js
