import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { cryptoAssets } from "@/lib/crypto-assets";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to request a crypto withdrawal." }, { status: 401 });
    }

    const body = await request.json();
    const asset = typeof body.asset === "string" ? body.asset.trim().toUpperCase() : "";
    const usdValue = Math.round(Number(body.usdValue) * 100) / 100;
    const allowedAssets = new Set(cryptoAssets.map((crypto) => crypto.asset));

    if (!allowedAssets.has(asset)) {
      return NextResponse.json({ error: "Choose a supported crypto asset." }, { status: 400 });
    }
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

    await ensurePricingDefaults();
    const rate = await prisma.cryptoRate.findUnique({ where: { asset } });
    if (!rate?.isActive || rate.nairaPayoutPerUsd <= 0) {
      return NextResponse.json({ error: "This crypto asset is not currently available for Naira withdrawals." }, { status: 400 });
    }

    const totalValue = Math.round(usdValue * rate.nairaPayoutPerUsd);
    const order = await prisma.$transaction(async (tx) => {
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

      await tx.userActivity.create({
        data: {
          userId: user.id,
          orderId: savedOrder.id,
          type: "TRADE_SUBMITTED",
          details: `Submitted ${asset} withdrawal request worth ${usdValue} USD.`,
        },
      });

      return savedOrder;
    });

    return NextResponse.json({ orderId: order.id, expectedPayout: totalValue, currency: "NGN" }, { status: 201 });
  } catch (error) {
    console.error("Crypto withdrawal request failed:", error);
    return NextResponse.json({ error: "We could not submit your crypto withdrawal request." }, { status: 500 });
  }
}
