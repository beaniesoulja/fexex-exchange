import { prisma } from "@/lib/prisma";
import { giftCards } from "@/lib/gift-cards";
import { cryptoAssets } from "@/lib/crypto-assets";
import { defaultGiftCardSubcategoriesByBrand } from "@/lib/gift-card-subcategories";

export const DEFAULT_USD_TO_NAIRA_RATE = 1600;
let pricingDefaultsPromise: Promise<void> | undefined;

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

async function seedPricingDefaults() {
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

  const seedSubcategories = async (giftCardRateId: string, entries: ReadonlyArray<readonly [string, string, string]>) => {
    await prisma.giftCardSubcategory.createMany({
      data: entries.map(([label, country, cardType], index) => ({ giftCardRateId, label, country, cardType, sortOrder: index })),
      skipDuplicates: true,
    });
  };
  // The trade screen asks for crypto and gift-card rates together. Seeding
  // one card at a time prevents the otherwise competing database transactions.
  for (const [brand, entries] of Object.entries(defaultGiftCardSubcategoriesByBrand)) {
    const giftCardRate = await prisma.giftCardRate.findUnique({ where: { brand }, select: { id: true } });
    if (giftCardRate) await seedSubcategories(giftCardRate.id, entries);
  }
}

export function ensurePricingDefaults() {
  if (!pricingDefaultsPromise) {
    pricingDefaultsPromise = seedPricingDefaults().catch((error) => {
      pricingDefaultsPromise = undefined;
      throw error;
    });
  }

  return pricingDefaultsPromise;
}

export async function getUsdToNairaRate() {
  await ensurePricingDefaults();
  const settings = await prisma.pricingSettings.findUniqueOrThrow({
    where: { id: "default" },
  });

  return settings.usdToNairaRate;
}
