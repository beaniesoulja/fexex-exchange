import { NextResponse } from "next/server";

import { giftCards } from "@/lib/gift-cards";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensurePricingDefaults();
    const savedRates = await prisma.giftCardRate.findMany();
    const ratesByBrand = new Map(savedRates.map((rate) => [rate.brand, rate]));

    return NextResponse.json({
      currency: "NGN",
      giftCards: giftCards.map((giftCard) => {
        const rate = ratesByBrand.get(giftCard.name);
        const nairaPayoutPerUsd = rate?.nairaPayoutPerUsd ?? 0;
        return {
          ...giftCard,
          nairaPayoutPerUsd,
          available: rate?.isActive === true && nairaPayoutPerUsd > 0,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load gift card prices:", error);
    return NextResponse.json({ error: "Unable to load gift card prices." }, { status: 500 });
  }
}
