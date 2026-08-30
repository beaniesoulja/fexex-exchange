import { NextResponse } from "next/server";

import { cryptoAssets } from "@/lib/crypto-assets";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let savedRates = await prisma.cryptoRate.findMany();

    // Do not reseed the catalog on normal customer requests. The gift-card
    // and crypto tiles are requested together after login.
    if (savedRates.length === 0) {
      await ensurePricingDefaults();
      savedRates = await prisma.cryptoRate.findMany();
    }

    return NextResponse.json({
      currency: "NGN",
      cryptoAssets: savedRates.map((rate) => {
        const builtInAsset = cryptoAssets.find((crypto) => crypto.asset === rate.asset);
        return {
          asset: rate.asset,
          name: rate.name ?? builtInAsset?.name ?? rate.asset,
          icon: rate.icon ?? (builtInAsset ? `/crypto-icons/${rate.asset.toLowerCase()}.svg` : "/crypto-icons/generic.svg"),
          nairaPayoutPerUsd: rate.nairaPayoutPerUsd,
          available: rate.isActive === true && rate.nairaPayoutPerUsd > 0,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load crypto prices:", error);
    return NextResponse.json({ error: "Unable to load crypto prices." }, { status: 500 });
  }
}
