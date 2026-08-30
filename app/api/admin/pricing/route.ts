import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { giftCards } from "@/lib/gift-cards";
import { ensurePricingDefaults } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

const MAX_USD_TO_NAIRA_RATE = 10_000_000;
const MAX_NAIRA_PAYOUT_RATE = 1_000_000;
const MAX_LABEL_LENGTH = 64;
const MAX_SUBCATEGORY_LABEL_LENGTH = 180;
const MAX_ICON_LENGTH = 2_800_000;
const CATALOG_CODE = /^[A-Z0-9_-]{2,16}$/;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN";
}

function cleanText(value: unknown, field: string, required = true, maxLength = MAX_LABEL_LENGTH) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new Error(`${field} is required.`);
  if (text.length > maxLength) throw new Error(`${field} must be ${maxLength} characters or fewer.`);
  return text;
}

function cleanIcon(value: unknown) {
  const icon = typeof value === "string" ? value.trim() : "";
  if (icon.length > MAX_ICON_LENGTH) throw new Error("The image is too large. Choose an image under 2MB.");
  return icon || null;
}

function readPayoutRate(value: unknown, label: string) {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > MAX_NAIRA_PAYOUT_RATE) {
    throw new Error(`Enter a valid Naira payout rate for ${label}.`);
  }
  return rate;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await ensurePricingDefaults();
    const [settings, giftCardRates, cryptoRates] = await Promise.all([
      prisma.pricingSettings.findUniqueOrThrow({ where: { id: "default" } }),
      prisma.giftCardRate.findMany({ include: { subcategories: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } }, orderBy: { brand: "asc" } }),
      prisma.cryptoRate.findMany({ orderBy: { asset: "asc" } }),
    ]);
    return NextResponse.json({ usdToNairaRate: settings.usdToNairaRate, giftCardRates, cryptoRates, updatedAt: settings.updatedAt });
  } catch (error) {
    console.error("Failed to load pricing settings:", error);
    return NextResponse.json({ error: "Failed to load pricing settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const kind = body?.kind;
    const isActive = body?.isActive;
    if (typeof isActive !== "boolean") return NextResponse.json({ error: "Choose whether FEXEX is buying this listing." }, { status: 400 });

    await ensurePricingDefaults();
    const settings = await prisma.pricingSettings.findUniqueOrThrow({ where: { id: "default" } });

    if (kind === "giftcard") {
      const brand = cleanText(body.brand, "Gift card name");
      const code = cleanText(body.code, "Gift card code").toUpperCase();
      if (!CATALOG_CODE.test(code)) return NextResponse.json({ error: "Gift card code must use 2–16 letters, numbers, hyphens, or underscores." }, { status: 400 });
      const nairaPayoutPerUsd = readPayoutRate(body.nairaPayoutPerUsd, brand);
      const icon = cleanIcon(body.icon);
      if (!icon) return NextResponse.json({ error: "Add a gift-card image URL or upload an image." }, { status: 400 });
      const existingCode = await prisma.giftCardRate.findFirst({ where: { code } });
      if (existingCode || giftCards.some((giftCard) => giftCard.code === code)) return NextResponse.json({ error: "That gift-card code is already listed." }, { status: 409 });
      const giftCardRate = await prisma.giftCardRate.create({
        data: { brand, code, icon, nairaPayoutPerUsd, payoutPercent: (nairaPayoutPerUsd / settings.usdToNairaRate) * 100, nairaPayoutPerThousand: 0, isActive },
      });
      return NextResponse.json({ message: `${brand} has been added to the gift-card catalog.`, giftCardRate }, { status: 201 });
    }

    if (kind === "crypto") {
      const asset = cleanText(body.asset, "Crypto ticker").toUpperCase();
      if (!CATALOG_CODE.test(asset)) return NextResponse.json({ error: "Crypto ticker must use 2–16 letters, numbers, hyphens, or underscores." }, { status: 400 });
      const name = cleanText(body.name, "Crypto name");
      const nairaPayoutPerUsd = readPayoutRate(body.nairaPayoutPerUsd, asset);
      const cryptoRate = await prisma.cryptoRate.create({ data: { asset, name, icon: cleanIcon(body.icon), nairaPayoutPerUsd, isActive } });
      return NextResponse.json({ message: `${asset} has been added to the crypto catalog.`, cryptoRate }, { status: 201 });
    }

    if (kind === "giftcard-subcategory") {
      const brand = cleanText(body.brand, "Gift card name");
      const giftCardRate = await prisma.giftCardRate.findUnique({ where: { brand } });
      if (!giftCardRate) return NextResponse.json({ error: "Choose a gift card from the catalog first." }, { status: 400 });
      const label = cleanText(body.label, "Sub-category name", true, MAX_SUBCATEGORY_LABEL_LENGTH);
      const country = cleanText(body.country, "Country", false);
      const cardType = cleanText(body.cardType, "Card type", false);
      const nairaPayoutPerUsd = readPayoutRate(body.nairaPayoutPerUsd, label);
      const subcategory = await prisma.giftCardSubcategory.upsert({
        where: { giftCardRateId_label: { giftCardRateId: giftCardRate.id, label } },
        update: { country: country || null, cardType: cardType || null, nairaPayoutPerUsd, isActive },
        create: { giftCardRateId: giftCardRate.id, label, country: country || null, cardType: cardType || null, nairaPayoutPerUsd, isActive },
      });
      return NextResponse.json({ message: `${label} has been saved for ${brand}.`, subcategory }, { status: 201 });
    }

    return NextResponse.json({ error: "Choose a valid catalog type." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) return NextResponse.json({ error: "That name, code, or ticker is already listed." }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to create catalog listing:", error);
    return NextResponse.json({ error: "Failed to create the catalog listing." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const usdToNairaRate = Number(body.usdToNairaRate);
    const giftCardRates = body.giftCardRates;
    const cryptoRates = body.cryptoRates;
    const giftCardSubcategories = body.giftCardSubcategories ?? [];
    if (!Number.isFinite(usdToNairaRate) || usdToNairaRate <= 0 || usdToNairaRate > MAX_USD_TO_NAIRA_RATE) return NextResponse.json({ error: "Enter a valid USD to Naira rate." }, { status: 400 });
    if (!Array.isArray(giftCardRates) || !Array.isArray(cryptoRates) || !Array.isArray(giftCardSubcategories)) return NextResponse.json({ error: "Include the current gift-card and crypto rates." }, { status: 400 });

    const suppliedBrands = new Set<string>();
    const giftCardUpdates = giftCardRates.map((item) => {
      const brand = cleanText(item?.brand, "Gift card name");
      if (suppliedBrands.has(brand)) throw new Error("Each gift card can only be included once.");
      suppliedBrands.add(brand);
      if (typeof item?.isActive !== "boolean") throw new Error(`Choose whether FEXEX is buying ${brand}.`);
      return { brand, nairaPayoutPerUsd: readPayoutRate(item.nairaPayoutPerUsd, brand), isActive: item.isActive };
    });
    const suppliedAssets = new Set<string>();
    const cryptoUpdates = cryptoRates.map((item) => {
      const asset = cleanText(item?.asset, "Crypto ticker").toUpperCase();
      if (suppliedAssets.has(asset)) throw new Error("Each crypto asset can only be included once.");
      suppliedAssets.add(asset);
      if (typeof item?.isActive !== "boolean") throw new Error(`Choose whether FEXEX is buying ${asset}.`);
      return { asset, nairaPayoutPerUsd: readPayoutRate(item.nairaPayoutPerUsd, asset), isActive: item.isActive };
    });
    const subcategoryUpdates = giftCardSubcategories.map((item) => {
      const id = cleanText(item?.id, "Gift card sub-category ID");
      const label = cleanText(item?.label, "Gift card sub-category", true, MAX_SUBCATEGORY_LABEL_LENGTH);
      if (typeof item?.isActive !== "boolean") throw new Error(`Choose whether FEXEX is buying ${label}.`);
      return { id, label, nairaPayoutPerUsd: readPayoutRate(item.nairaPayoutPerUsd, label), isActive: item.isActive };
    });

    await ensurePricingDefaults();
    await prisma.$transaction(async (tx) => {
      await tx.pricingSettings.update({ where: { id: "default" }, data: { usdToNairaRate } });
      const savedGiftCardRates = await Promise.all(giftCardUpdates.map((rate) => tx.giftCardRate.update({ where: { brand: rate.brand }, data: { nairaPayoutPerUsd: rate.nairaPayoutPerUsd, payoutPercent: (rate.nairaPayoutPerUsd / usdToNairaRate) * 100, isActive: rate.isActive } })));
      const savedCryptoRates = await Promise.all(cryptoUpdates.map((rate) => tx.cryptoRate.update({ where: { asset: rate.asset }, data: rate })));
      await Promise.all(subcategoryUpdates.map((subcategory) => tx.giftCardSubcategory.update({ where: { id: subcategory.id }, data: { nairaPayoutPerUsd: subcategory.nairaPayoutPerUsd, isActive: subcategory.isActive } })));
      return { savedGiftCardRates, savedCryptoRates };
    });
    const [savedGiftCardRates, savedCryptoRates] = await Promise.all([
      prisma.giftCardRate.findMany({ include: { subcategories: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] } }, orderBy: { brand: "asc" } }),
      prisma.cryptoRate.findMany({ orderBy: { asset: "asc" } }),
    ]);
    return NextResponse.json({ message: "Pricing saved successfully.", usdToNairaRate, giftCardRates: savedGiftCardRates, cryptoRates: savedCryptoRates });
  } catch (error) {
    if (error instanceof Error) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Failed to save pricing settings:", error);
    return NextResponse.json({ error: "Failed to save pricing settings." }, { status: 500 });
  }
}
