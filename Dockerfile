# syntax=docker/dockerfile:1.7

# Stage 1: deps
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile
RUN bun run db:generate

# Stage 2: builder
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install -g bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV DATABASE_URL="file:/tmp/build.db"
ENV ADMIN_PIN="1234"
RUN bun run build

# Stage 3: runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 astro && \
    useradd --system --uid 1001 --gid astro --home-dir /app --shell /bin/bash astro
RUN mkdir -p /app/data && chown -R astro:astro /app
COPY --from=builder --chown=astro:astro /app/.next/standalone ./
COPY --from=builder --chown=astro:astro /app/.next/static ./.next/static
COPY --from=builder --chown=astro:astro /app/public ./public
RUN rm -rf /app/node_modules
COPY --from=deps --chown=astro:astro /app/node_modules ./node_modules
COPY --from=deps --chown=astro:astro /app/prisma ./prisma
COPY --chown=astro:astro docker-entrypoint.sh /usr/local/bin/docker-entrypoint
RUN chmod +x /usr/local/bin/docker-entrypoint
USER astro
EXPOSE 3000
ENV DATABASE_URL="file:/app/data/custom.db"
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/api/track || exit 1
ENTRYPOINT ["docker-entrypoint"]
CMD ["node", "server.js"]
