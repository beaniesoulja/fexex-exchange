import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { giftCards } from "@/lib/gift-cards";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

const MAX_USD_TO_NAIRA_RATE = 10_000_000;
const MAX_GIFT_CARD_NAIRA_RATE = 1_000_000;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensurePricingDefaults();
    const [settings, giftCardRates] = await Promise.all([
      prisma.pricingSettings.findUniqueOrThrow({ where: { id: "default" } }),
      prisma.giftCardRate.findMany({ orderBy: { brand: "asc" } }),
    ]);

    return NextResponse.json({
      usdToNairaRate: settings.usdToNairaRate,
      giftCardRates,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error("Failed to load pricing settings:", error);
    return NextResponse.json({ error: "Failed to load pricing settings." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const usdToNairaRate = Number(body.usdToNairaRate);
    const giftCardRates = body.giftCardRates;

    if (!Number.isFinite(usdToNairaRate) || usdToNairaRate <= 0 || usdToNairaRate > MAX_USD_TO_NAIRA_RATE) {
      return NextResponse.json({ error: "Enter a valid USD to Naira rate." }, { status: 400 });
    }

    if (!Array.isArray(giftCardRates) || giftCardRates.length !== giftCards.length) {
      return NextResponse.json({ error: "Include a payout rate for every gift card." }, { status: 400 });
    }

    const allowedBrands = new Set<string>(giftCards.map((giftCard) => giftCard.name));
    const suppliedBrands = new Set<string>();
    const updates: Array<{ brand: string; nairaPayoutPerThousand: number; isActive: boolean }> = [];

    for (const item of giftCardRates) {
      const brand = item?.brand;
      const nairaPayoutPerThousand = Number(item?.nairaPayoutPerThousand);
      const isActive = item?.isActive;
      if (typeof brand !== "string" || !allowedBrands.has(brand) || suppliedBrands.has(brand)) {
        return NextResponse.json({ error: "Invalid gift card list." }, { status: 400 });
      }
      if (!Number.isFinite(nairaPayoutPerThousand) || nairaPayoutPerThousand < 0 || nairaPayoutPerThousand > MAX_GIFT_CARD_NAIRA_RATE) {
        return NextResponse.json({ error: `Enter a valid Naira payout rate for ${brand}.` }, { status: 400 });
      }
      if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: `Choose whether Fexex is buying ${brand}.` }, { status: 400 });
      }

      suppliedBrands.add(brand);
      updates.push({ brand, nairaPayoutPerThousand, isActive });
    }

    await ensurePricingDefaults();
    const savedGiftCardRates = await prisma.$transaction(async (tx) => {
      await tx.pricingSettings.update({
        where: { id: "default" },
        data: { usdToNairaRate },
      });

      return Promise.all(
        updates.map((rate) =>
          tx.giftCardRate.update({
            where: { brand: rate.brand },
            data: {
              nairaPayoutPerThousand: rate.nairaPayoutPerThousand,
              payoutPercent: rate.nairaPayoutPerThousand / 10,
              isActive: rate.isActive,
            },
          }),
        ),
      );
    });

    return NextResponse.json({
      message: "Pricing saved successfully.",
      usdToNairaRate,
      giftCardRates: savedGiftCardRates,
    });
  } catch (error) {
    console.error("Failed to save pricing settings:", error);
    return NextResponse.json({ error: "Failed to save pricing settings." }, { status: 500 });
  }
}
