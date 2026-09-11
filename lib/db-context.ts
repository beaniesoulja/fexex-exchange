import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Row Level Security is enabled on every user-owned table (Order, Wallet,
 * TradeMessage, SupportTicket, SupportMessage, UserActivity, LoginSession,
 * Swap, Payout, ProfileAudit) as a database-level backstop: even if a future
 * route forgets a `where: { userId }` filter, Postgres itself still refuses
 * to return another user's rows.
 *
 * The scope variables must be set with `set_config(..., true)` (transaction-
 * local) inside the SAME transaction as the query that follows. Neon's
 * pooled connection can hand different requests different physical
 * connections, so a plain `SET` outside a transaction could leak between
 * requests — wrapping every scoped query in `$transaction` is what makes
 * this safe.
 */
export function withUserScope<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true), set_config('app.is_admin', 'false', true)`;
    return fn(tx);
  });
}

export function withAdminScope<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_user_id', '', true), set_config('app.is_admin', 'true', true)`;
    return fn(tx);
  });
}

/**
 * Picks the right scope for a session that may or may not be an admin —
 * for routes (like trade/ticket messages) an admin and the owning customer
 * both legitimately read, so the scope depends on who's asking.
 */
export function withScope<T>(session: { user: { id: string; role?: string | null } }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return session.user.role === "ADMIN" ? withAdminScope(fn) : withUserScope(session.user.id, fn);
}

export type { Prisma };
