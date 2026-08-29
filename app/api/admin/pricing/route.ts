import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { giftCards } from "@/lib/gift-cards";
import { cryptoAssets } from "@/lib/crypto-assets";
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
    const [settings, giftCardRates, cryptoRates] = await Promise.all([
      prisma.pricingSettings.findUniqueOrThrow({ where: { id: "default" } }),
      prisma.giftCardRate.findMany({ orderBy: { brand: "asc" } }),
      prisma.cryptoRate.findMany({ orderBy: { asset: "asc" } }),
    ]);

    return NextResponse.json({
      usdToNairaRate: settings.usdToNairaRate,
      giftCardRates,
      cryptoRates,
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
    const cryptoRates = body.cryptoRates;

    if (!Number.isFinite(usdToNairaRate) || usdToNairaRate <= 0 || usdToNairaRate > MAX_USD_TO_NAIRA_RATE) {
      return NextResponse.json({ error: "Enter a valid USD to Naira rate." }, { status: 400 });
    }

    if (!Array.isArray(giftCardRates) || giftCardRates.length !== giftCards.length) {
      return NextResponse.json({ error: "Include a payout rate for every gift card." }, { status: 400 });
    }

    const allowedBrands = new Set<string>(giftCards.map((giftCard) => giftCard.name));
    const suppliedBrands = new Set<string>();
    const updates: Array<{ brand: string; nairaPayoutPerUsd: number; isActive: boolean }> = [];

    for (const item of giftCardRates) {
      const brand = item?.brand;
      const nairaPayoutPerUsd = Number(item?.nairaPayoutPerUsd);
      const isActive = item?.isActive;
      if (typeof brand !== "string" || !allowedBrands.has(brand) || suppliedBrands.has(brand)) {
        return NextResponse.json({ error: "Invalid gift card list." }, { status: 400 });
      }
      if (!Number.isFinite(nairaPayoutPerUsd) || nairaPayoutPerUsd < 0 || nairaPayoutPerUsd > MAX_GIFT_CARD_NAIRA_RATE) {
        return NextResponse.json({ error: `Enter a valid Naira payout rate for ${brand}.` }, { status: 400 });
      }
      if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: `Choose whether Fexex is buying ${brand}.` }, { status: 400 });
      }

      suppliedBrands.add(brand);
      updates.push({ brand, nairaPayoutPerUsd, isActive });
    }

    if (!Array.isArray(cryptoRates) || cryptoRates.length !== cryptoAssets.length) {
      return NextResponse.json({ error: "Include a payout rate for every crypto asset." }, { status: 400 });
    }

    const allowedAssets = new Set<string>(cryptoAssets.map((crypto) => crypto.asset));
    const suppliedAssets = new Set<string>();
    const cryptoUpdates: Array<{ asset: string; nairaPayoutPerUsd: number; isActive: boolean }> = [];
    for (const item of cryptoRates) {
      const asset = item?.asset;
      const nairaPayoutPerUsd = Number(item?.nairaPayoutPerUsd);
      const isActive = item?.isActive;
      if (typeof asset !== "string" || !allowedAssets.has(asset) || suppliedAssets.has(asset)) {
        return NextResponse.json({ error: "Invalid crypto asset list." }, { status: 400 });
      }
      if (!Number.isFinite(nairaPayoutPerUsd) || nairaPayoutPerUsd < 0 || nairaPayoutPerUsd > MAX_GIFT_CARD_NAIRA_RATE) {
        return NextResponse.json({ error: `Enter a valid Naira payout rate for ${asset}.` }, { status: 400 });
      }
      if (typeof isActive !== "boolean") {
        return NextResponse.json({ error: `Choose whether FEXEX is buying ${asset}.` }, { status: 400 });
      }
      suppliedAssets.add(asset);
      cryptoUpdates.push({ asset, nairaPayoutPerUsd, isActive });
    }

    await ensurePricingDefaults();
    const savedRates = await prisma.$transaction(async (tx) => {
      await tx.pricingSettings.update({
        where: { id: "default" },
        data: { usdToNairaRate },
      });

      const savedGiftCardRates = await Promise.all(
        updates.map((rate) =>
          tx.giftCardRate.update({
            where: { brand: rate.brand },
            data: {
              nairaPayoutPerUsd: rate.nairaPayoutPerUsd,
              payoutPercent: (rate.nairaPayoutPerUsd / usdToNairaRate) * 100,
              isActive: rate.isActive,
            },
          }),
        ),
      );
      const savedCryptoRates = await Promise.all(
        cryptoUpdates.map((rate) => tx.cryptoRate.update({ where: { asset: rate.asset }, data: rate })),
      );
      return { savedGiftCardRates, savedCryptoRates };
    });

    return NextResponse.json({
      message: "Pricing saved successfully.",
      usdToNairaRate,
      giftCardRates: savedRates.savedGiftCardRates,
      cryptoRates: savedRates.savedCryptoRates,
    });
  } catch (error) {
    console.error("Failed to save pricing settings:", error);
    return NextResponse.json({ error: "Failed to save pricing settings." }, { status: 500 });
  }
}
