import { NextResponse } from "next/server";

import { giftCards } from "@/lib/gift-cards";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let savedRates = await prisma.giftCardRate.findMany({
      include: { subcategories: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
    });

    // A populated catalog is already the source of truth. Avoid reseeding it
    // during every customer request, especially when crypto rates load too.
    if (savedRates.length === 0) {
      await ensurePricingDefaults();
      savedRates = await prisma.giftCardRate.findMany({
        include: { subcategories: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } },
      });
    }

    return NextResponse.json({
      currency: "NGN",
      giftCards: savedRates.map((rate) => {
        const builtInCard = giftCards.find((giftCard) => giftCard.name === rate.brand);
        return {
          name: rate.brand,
          code: rate.code ?? builtInCard?.code ?? rate.brand.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 16),
          icon: rate.icon ?? builtInCard?.icon ?? "/giftcard-icons/generic.svg",
          nairaPayoutPerUsd: rate.nairaPayoutPerUsd,
          available: rate.isActive === true && rate.nairaPayoutPerUsd > 0,
          subcategories: rate.subcategories.map((subcategory) => ({
            label: subcategory.label,
            country: subcategory.country,
            cardType: subcategory.cardType,
            nairaPayoutPerUsd: subcategory.nairaPayoutPerUsd,
          })),
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load gift card prices:", error);
    return NextResponse.json({ error: "Unable to load gift card prices." }, { status: 500 });
  }
}
