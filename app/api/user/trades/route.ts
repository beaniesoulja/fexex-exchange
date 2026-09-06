import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = await prisma.order.findMany({
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
  });

  return NextResponse.json({ trades });
}
