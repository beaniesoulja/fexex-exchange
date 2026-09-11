import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { withAdminScope, withUserScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(_request: Request, context: RouteContext<"/api/trades/[orderId]/receipt">) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`receipt-get:${session.user.id}`, RATE_LIMITS.authedReadFast);
  if (limited) return limited;

  const isAdmin = session.user.role === "ADMIN";
  const { orderId } = await context.params;
  const order = isAdmin
    ? await withAdminScope((tx) => tx.order.findUnique({ where: { id: orderId }, include: { user: { select: { email: true, username: true } } } }))
    : await withUserScope(session.user.id, (tx) => tx.order.findUnique({ where: { id: orderId }, include: { user: { select: { email: true, username: true } } } }));
  if (!order || (order.userId !== session.user.id && !isAdmin)) {
    return NextResponse.json({ error: "Trade receipt not found." }, { status: 404 });
  }

  const sessionId = order.referenceId ?? `FEX-${order.id.toUpperCase()}`;
  return NextResponse.json({
    sessionId,
    issuedAt: order.createdAt,
    status: order.status,
    resultDescription: order.resultDescription,
    resolvedAt: order.resolvedAt,
    customer: order.user.username ? `@${order.user.username}` : order.user.email,
    trade: {
      type: order.type,
      amountUsd: order.amount,
      nairaPerUsd: order.rate,
      expectedPayoutNaira: order.totalValue,
      giftCard: order.type === "SELL_GIFTCARD" ? {
        brand: order.giftCardBrand,
        country: order.giftCardCountry,
        subcategory: order.giftCardSubcategory,
        cardDetails: "Submitted securely for Admin review",
        imageSubmitted: Boolean(order.giftCardImage),
      } : null,
      crypto: order.type === "SELL_CRYPTO" ? {
        asset: order.cryptoAsset,
        payoutBankName: order.payoutBankName,
        payoutAccountName: order.payoutAccountName,
        payoutAccountNumber: order.payoutBankAccountNumber ? `••••••${order.payoutBankAccountNumber.slice(-4)}` : null,
      } : null,
    },
  });
}
