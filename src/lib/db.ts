import { PrismaClient } from '@prisma/client'

const PRISMA_SCHEMA_VERSION = 'v3-sites-colors'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  __prismaSchemaVersion?: string
}

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
  globalForPrisma.prisma = db
}
