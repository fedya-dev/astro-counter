# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1: deps — install ALL dependencies (incl. devDeps for prisma generate)
# =============================================================================
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# OpenSSL is required by Prisma engines on Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Bun is used by the project; install it for reproducible dependency install
RUN npm install -g bun

# Copy lockfile + manifest first for layer caching
COPY package.json bun.lock ./
COPY prisma ./prisma

# Install dependencies (this includes prisma client + engines + prisma CLI)
RUN bun install --frozen-lockfile

# Generate Prisma Client into node_modules
RUN bun run db:generate

# =============================================================================
# Stage 2: builder — compile the Next.js standalone build
# =============================================================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm install -g bun

# Copy dependencies from deps stage (including generated Prisma Client + CLI)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build-time env (DATABASE_URL only needed for prisma-related build steps;
# the standalone build inlines NEXT_PUBLIC_* env vars).
ARG NEXT_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV DATABASE_URL="file:/tmp/build.db"
ENV ADMIN_PIN="1234"

# Build the standalone production output
RUN bun run build

# =============================================================================
# Stage 3: runner — minimal runtime image
# =============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install runtime essentials: openssl for Prisma engine + curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Create a non-root user for security
RUN groupadd --system --gid 1001 astro && \
    useradd --system --uid 1001 --gid astro --home-dir /app --shell /bin/bash astro

# Create data directory and give it to the astro user
RUN mkdir -p /app/data && chown -R astro:astro /app

# Copy the standalone Next.js server (small, ~50MB)
COPY --from=builder --chown=astro:astro /app/.next/standalone ./
COPY --from=builder --chown=astro:astro /app/.next/static ./.next/static
COPY --from=builder --chown=astro:astro /app/public ./public

# Copy the entire deps node_modules (Prisma CLI + all its transitive deps +
# generated Prisma Client + engine binaries). This adds ~300MB to the image
# but is the only way to reliably run `prisma db push` at container startup
# without bundling every dep individually.
# NOTE: this overrides the standalone node_modules with the full tree.
RUN rm -rf /app/node_modules
COPY --from=deps --chown=astro:astro /app/node_modules ./node_modules

# Copy the Prisma schema (so `prisma db push` can read it)
COPY --from=deps --chown=astro:astro /app/prisma ./prisma

# Copy the entrypoint script
COPY --chown=astro:astro docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint

USER astro

EXPOSE 3000

ENV DATABASE_URL="file:/app/data/custom.db"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/track || exit 1

ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "server.js"]
