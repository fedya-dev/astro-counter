import { PrismaClient } from '@prisma/client'

// Bump this when the schema changes — forces a fresh PrismaClient instance
// after `bun run db:push` during dev hot reloads.
const PRISMA_SCHEMA_VERSION = 'v2-sites'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaSchemaVersion?: string
}

// If the schema version changed, drop the cached instance so the next access
// creates a fresh client that knows about the new schema fields.
if (
  globalForPrisma.prisma &&
  globalForPrisma.__prismaSchemaVersion !== PRISMA_SCHEMA_VERSION
) {
  try {
    void globalForPrisma.prisma.$disconnect()
  } catch {}
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

globalForPrisma.prisma = db
globalForPrisma.__prismaSchemaVersion = PRISMA_SCHEMA_VERSION

if (process.env.NODE_ENV !== 'production') {
  // keep the singleton on globalThis so HMR doesn't open a new connection every reload
  globalForPrisma.prisma = db
}
