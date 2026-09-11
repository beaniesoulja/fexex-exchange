import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DAILY_QUOTAS, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to request a crypto withdrawal." }, { status: 401 });
    }
    const rateLimited = await enforceRateLimit(`withdrawals-submit:${session.user.id}`, RATE_LIMITS.financialSubmit);
    if (rateLimited) return rateLimited;
    const quotaLimited = await enforceRateLimit(`withdrawals-quota:${session.user.id}`, DAILY_QUOTAS.trades, "You've reached today's withdrawal request limit. Please try again tomorrow or contact support.");
    if (quotaLimited) return quotaLimited;

    const body = await request.json();
    const asset = typeof body.asset === "string" ? body.asset.trim().toUpperCase() : "";
    const usdValue = Math.round(Number(body.usdValue) * 100) / 100;
    if (!asset) return NextResponse.json({ error: "Choose a crypto asset." }, { status: 400 });
    if (!Number.isFinite(usdValue) || usdValue < 0.01) {
      return NextResponse.json({ error: "Enter a valid crypto value in USD." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Your FEXEX account could not be found." }, { status: 404 });
    }
    if (!user.bankName || !user.bankAccountNumber || !user.legalName) {
      return NextResponse.json({ error: "Save your default bank account before requesting a withdrawal." }, { status: 400 });
    }

    const rate = await prisma.cryptoRate.findUnique({ where: { asset } });
    if (!rate) {
      return NextResponse.json({ error: "Choose a supported crypto asset." }, { status: 400 });
    }
    if (!rate.isActive || rate.nairaPayoutPerUsd <= 0) {
      return NextResponse.json({ error: "This crypto asset is not currently available for Naira withdrawals." }, { status: 400 });
    }

    const totalValue = Math.round(usdValue * rate.nairaPayoutPerUsd);
    const order = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${user.id}, true), set_config('app.is_admin', 'false', true)`;

      const savedOrder = await tx.order.create({
        data: {
          userId: user.id,
          type: "SELL_CRYPTO",
          status: "PENDING",
          amount: usdValue,
          rate: rate.nairaPayoutPerUsd,
          totalValue,
          cryptoAsset: asset,
          payoutBankName: user.bankName,
          payoutAccountName: user.legalName,
          payoutBankAccountNumber: user.bankAccountNumber,
        },
      });

      const orderWithReference = await tx.order.update({
        where: { id: savedOrder.id },
        data: { referenceId: `FEX-${savedOrder.id.toUpperCase()}` },
      });

      await tx.userActivity.create({
        data: {
          userId: user.id,
          orderId: orderWithReference.id,
          type: "TRADE_SUBMITTED",
          details: `Submitted ${asset} withdrawal request worth ${usdValue} USD. Trade session: ${orderWithReference.referenceId}.`,
        },
      });

      await tx.tradeMessage.create({
        data: {
          orderId: orderWithReference.id,
          senderId: user.id,
          body: `Crypto withdrawal submitted. Trade session ID: ${orderWithReference.referenceId}. I am ready for Admin review.`,
        },
      });

      return orderWithReference;
    });

    return NextResponse.json({ orderId: order.id, referenceId: order.referenceId, expectedPayout: totalValue, currency: "NGN" }, { status: 201 });
  } catch (error) {
    console.error("Crypto withdrawal request failed:", error);
    return NextResponse.json({ error: "We could not submit your crypto withdrawal request." }, { status: 500 });
  }
}
