import { prisma } from "@/lib/prisma";
import { giftCards } from "@/lib/gift-cards";

export const DEFAULT_USD_TO_NAIRA_RATE = 1600;

// These preserve the gift-card rates that were already active. A 0% rate keeps
// the remaining cards visible to admins but unavailable until a rate is set.
const DEFAULT_GIFT_CARD_RATES: Record<string, number> = {
  Amazon: 90,
  Apple: 85,
  "Google Play": 0,
  Steam: 80,
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
          payoutPercent: DEFAULT_GIFT_CARD_RATES[giftCard.name] ?? 0,
          isActive: (DEFAULT_GIFT_CARD_RATES[giftCard.name] ?? 0) > 0,
        },
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
