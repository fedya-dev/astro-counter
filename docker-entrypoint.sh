#!/bin/bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-file:/app/data/custom.db}"
export ADMIN_PIN="${ADMIN_PIN:-1234}"
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"

echo "================================================"
echo "  Astro Visitor Counter — starting up"
echo "================================================"
echo "  Database: $DATABASE_URL"
echo "  Admin PIN: configured ($([ ${#ADMIN_PIN} -ge 4 ] && echo 'yes' || echo 'NO — set ADMIN_PIN env var!'))"
echo "  Port: $PORT"
echo "================================================"

mkdir -p "$(dirname "$(echo "$DATABASE_URL" | sed 's/^file://')")" 2>/dev/null || true

echo "[entrypoint] Applying Prisma schema to database..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate || {
    echo "[entrypoint] WARNING: prisma db push failed. Continuing anyway."
}

echo "[entrypoint] Starting Next.js server on $HOSTNAME:$PORT..."
exec node server.js
