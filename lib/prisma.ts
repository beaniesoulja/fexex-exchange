// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Threshold-based slow-query logging: surfaces expensive queries in the
// hosting provider's logs (e.g. Vercel) instead of only finding out about
// them from a resource-usage bill after the fact.
const SLOW_QUERY_THRESHOLD_MS = 200

function createPrismaClient() {
  const client = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  })
  client.$on('query', (event) => {
    if (event.duration >= SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[slow-query] ${event.duration}ms: ${event.query}`)
    }
  })
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma