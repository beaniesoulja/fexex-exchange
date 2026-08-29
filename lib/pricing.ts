import { prisma } from "@/lib/prisma";
import { giftCards } from "@/lib/gift-cards";
import { cryptoAssets } from "@/lib/crypto-assets";

export const DEFAULT_USD_TO_NAIRA_RATE = 1600;

// Naira paid for every $1 of gift-card face value. A 0 rate keeps a card
// visible to admins but unavailable until a Naira payout is set.
const DEFAULT_GIFT_CARD_NAIRA_RATES: Record<string, number> = {
  Amazon: 1440,
  Apple: 1360,
  "Google Play": 0,
  Steam: 1280,
  Xbox: 0,
  "Razer Gold": 0,
  Sephora: 0,
  eBay: 0,
  "American Express (Amex)": 0,
};

export async function ensurePricingDefaults() {
  await prisma.$transaction([
    prisma.pricingSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", usdToNairaRate: DEFAULT_USD_TO_NAIRA_RATE },
    }),
    ...giftCards.map((giftCard) =>
      prisma.giftCardRate.upsert({
        where: { brand: giftCard.name },
        update: {},
        create: {
          brand: giftCard.name,
          // Retained for compatibility with older records; customer pricing uses
          // nairaPayoutPerUsd exclusively.
          payoutPercent: ((DEFAULT_GIFT_CARD_NAIRA_RATES[giftCard.name] ?? 0) / DEFAULT_USD_TO_NAIRA_RATE) * 100,
          nairaPayoutPerThousand: 0,
          nairaPayoutPerUsd: DEFAULT_GIFT_CARD_NAIRA_RATES[giftCard.name] ?? 0,
          isActive: (DEFAULT_GIFT_CARD_NAIRA_RATES[giftCard.name] ?? 0) > 0,
        },
      }),
    ),
    ...cryptoAssets.map((crypto) =>
      prisma.cryptoRate.upsert({
        where: { asset: crypto.asset },
        update: {},
        create: { asset: crypto.asset, nairaPayoutPerUsd: DEFAULT_USD_TO_NAIRA_RATE, isActive: true },
      }),
    ),
  ]);
}

export async function getUsdToNairaRate() {
  await ensurePricingDefaults();
  const settings = await prisma.pricingSettings.findUniqueOrThrow({
    where: { id: "default" },
  });

  return settings.usdToNairaRate;
}
