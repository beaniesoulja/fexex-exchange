import { NextResponse } from "next/server";

import { cryptoAssets } from "@/lib/crypto-assets";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await ensurePricingDefaults();
    const savedRates = await prisma.cryptoRate.findMany();
    const ratesByAsset = new Map(savedRates.map((rate) => [rate.asset, rate]));

    return NextResponse.json({
      currency: "NGN",
      cryptoAssets: cryptoAssets.map((crypto) => {
        const rate = ratesByAsset.get(crypto.asset);
        const nairaPayoutPerUsd = rate?.nairaPayoutPerUsd ?? 0;
        return {
          ...crypto,
          nairaPayoutPerUsd,
          available: rate?.isActive === true && nairaPayoutPerUsd > 0,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load crypto prices:", error);
    return NextResponse.json({ error: "Unable to load crypto prices." }, { status: 500 });
  }
}
