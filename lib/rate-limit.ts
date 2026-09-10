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
