import { prisma } from "@/lib/prisma";

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter backed by Postgres, so it works correctly across
 * Vercel's stateless/multi-instance serverless functions (an in-memory
 * counter would reset per instance and not actually limit anything).
 */
export async function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMs);

  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  await prisma.rateLimitHit.create({ data: { key } });

  // Opportunistically clear out this key's expired hits so the table doesn't
  // grow unbounded. Best-effort — failure here should never block the request.
  void prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: windowStart } } }).catch(() => {});

  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function tooManyRequestsResponse(retryAfterSeconds: number, message = "Too many requests. Please try again later.") {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Shared windows for the two things this app rate-limits:
 * - "abuse" windows stop a script from hammering an endpoint (sized well
 *   above the UI's own polling interval so real usage never trips them)
 * - "quota" windows are longer-window fair-use caps on sensitive actions
 *   (new trades, withdrawals, tickets), independent of short-term abuse
 */
export const RATE_LIMITS = {
  publicRead: { limit: 120, windowMs: MINUTE },
  authedReadFast: { limit: 60, windowMs: MINUTE },
  authedReadModerate: { limit: 30, windowMs: MINUTE },
  chatWrite: { limit: 30, windowMs: 10 * MINUTE },
  accountWrite: { limit: 20, windowMs: HOUR },
  heartbeat: { limit: 10, windowMs: MINUTE },
  financialSubmit: { limit: 10, windowMs: HOUR },
  adminAction: { limit: 120, windowMs: HOUR },
  ticketCreate: { limit: 5, windowMs: HOUR },
  tokenConfirm: { limit: 10, windowMs: HOUR },
  webhook: { limit: 120, windowMs: MINUTE },
} as const;

export const DAILY_QUOTAS = {
  trades: { limit: 20, windowMs: DAY },
  tickets: { limit: 10, windowMs: DAY },
} as const;

/**
 * Runs a rate limit and returns a ready-to-return 429 Response when it's
 * exceeded, or null when the caller should proceed — lets call sites do
 * `const limited = await enforceRateLimit(...); if (limited) return limited;`
 */
export async function enforceRateLimit(key: string, options: RateLimitOptions, message?: string) {
  const { allowed, retryAfterSeconds } = await rateLimit(key, options);
  return allowed ? null : tooManyRequestsResponse(retryAfterSeconds, message);
}
