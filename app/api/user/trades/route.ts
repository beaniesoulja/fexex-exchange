import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { withUserScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`user-trades:${session.user.id}`, RATE_LIMITS.authedReadFast);
  if (limited) return limited;

  const trades = await withUserScope(session.user.id, (tx) => tx.order.findMany({
    where: { userId: session.user.id, status: { in: ["PENDING", "PROCESSING"] } },
    select: {
      id: true,
      referenceId: true,
      type: true,
      status: true,
      amount: true,
      totalValue: true,
      giftCardBrand: true,
      giftCardSubcategory: true,
      cryptoAsset: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  }));

  return NextResponse.json({ trades });
}
