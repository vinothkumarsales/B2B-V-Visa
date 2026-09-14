import { PrismaClient } from '@prisma/client'

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.DATABASE_POSTGRES_PRISMA_URL ||
  process.env.DATABASE_POSTGRES_POSTGRES_PRISMA_URL ||
  process.env.DATABASE_POSTGRES_POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
