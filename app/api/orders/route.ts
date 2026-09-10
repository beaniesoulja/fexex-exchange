// app/api/orders/route.ts
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensurePricingDefaults } from '@/lib/pricing';

const MAX_GIFTCARD_AMOUNT_USD = 5_000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to submit a gift card." }, { status: 401 });
    }

    const { brand, country, subcategory, amount, cardCode, cardPin, imageBase64 } = body;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Your Fexex account could not be found." }, { status: 404 });
    }

    if (typeof brand !== 'string' || !brand.trim() || brand.length > 80 || typeof country !== 'string' || country.length > 80) {
      return NextResponse.json({ error: "Choose a supported gift card for a Naira payout." }, { status: 400 });
    }
    if (typeof subcategory === "string" && subcategory.length > 240) {
      return NextResponse.json({ error: "Choose a valid gift-card sub-category." }, { status: 400 });
    }
    if (typeof cardCode !== "undefined" && (typeof cardCode !== "string" || cardCode.length > 500)) {
      return NextResponse.json({ error: "Enter a valid card code." }, { status: 400 });
    }
    if (typeof cardPin !== "undefined" && (typeof cardPin !== "string" || cardPin.length > 120)) {
      return NextResponse.json({ error: "Enter a valid card PIN." }, { status: 400 });
    }
    if (typeof imageBase64 !== "undefined" && imageBase64 !== null && (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image/") || imageBase64.length > 3_000_000)) {
      return NextResponse.json({ error: "Upload a valid card image under 2MB." }, { status: 400 });
    }

    await ensurePricingDefaults();
    const giftCardRate = await prisma.giftCardRate.findUnique({ where: { brand } });
    const selectedSubcategory = typeof subcategory === 'string' && subcategory.trim()
      ? await prisma.giftCardSubcategory.findUnique({ where: { giftCardRateId_label: { giftCardRateId: giftCardRate?.id ?? '', label: subcategory.trim() } } })
      : null;
    const activeSubcategoryCount = giftCardRate
      ? await prisma.giftCardSubcategory.count({ where: { giftCardRateId: giftCardRate.id, isActive: true } })
      : 0;
    if (activeSubcategoryCount > 0 && !selectedSubcategory) {
      return NextResponse.json({ error: "Choose the country and card type you are selling." }, { status: 400 });
    }
    if (typeof subcategory === 'string' && subcategory.trim() && (!selectedSubcategory || !selectedSubcategory.isActive || selectedSubcategory.nairaPayoutPerUsd <= 0)) {
      return NextResponse.json({ error: "This gift-card sub-category is not currently available for Naira payouts." }, { status: 400 });
    }
    const nairaPayoutPerUsd = selectedSubcategory?.nairaPayoutPerUsd ?? giftCardRate?.nairaPayoutPerUsd ?? 0;
    if (!giftCardRate?.isActive || nairaPayoutPerUsd <= 0) {
      return NextResponse.json({ error: "This gift card is not currently available for Naira payouts." }, { status: 400 });
    }

    const numericAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(numericAmount) || numericAmount < 0.01) {
      return NextResponse.json({ error: "Enter a valid gift card value in USD." }, { status: 400 });
    }
    if (numericAmount > MAX_GIFTCARD_AMOUNT_USD) {
      return NextResponse.json({ error: `A single gift card trade cannot exceed $${MAX_GIFTCARD_AMOUNT_USD.toLocaleString()}. Please submit a smaller amount or split it across multiple trades.` }, { status: 400 });
    }
    const rate = nairaPayoutPerUsd;
    const totalValue = Math.round(numericAmount * rate);

    // Save the order and an activity record together, without recording card codes or PINs in the activity log.
    const order = await prisma.$transaction(async (tx) => {
      const savedOrder = await tx.order.create({
        data: {
          userId: user.id,
          type: 'SELL_GIFTCARD',
          status: 'PENDING',
          amount: numericAmount,
          rate: rate,
          totalValue: totalValue,
          giftCardBrand: brand,
          giftCardCountry: selectedSubcategory?.country ?? country,
          giftCardSubcategory: selectedSubcategory?.label ?? null,
          giftCardCode: `${cardCode?.trim() || 'N/A'} | ${cardPin?.trim() || 'N/A'}`,
          giftCardImage: imageBase64 ?? null,
        },
      });

      const orderWithReference = await tx.order.update({
        where: { id: savedOrder.id },
        data: { referenceId: `FEX-${savedOrder.id.toUpperCase()}` },
      });

      await tx.userActivity.create({
        data: {
          userId: user.id,
          orderId: orderWithReference.id,
          type: 'TRADE_SUBMITTED',
          details: `Submitted ${brand} gift card for ${numericAmount} USD. Trade session: ${orderWithReference.referenceId}.`,
        },
      });

      await tx.tradeMessage.create({
        data: { orderId: orderWithReference.id, senderId: user.id, body: `Gift card submitted. Trade session ID: ${orderWithReference.referenceId}. I am ready for Admin review.` },
      });

      return orderWithReference;
    });
    try {
      await notifyAdmin({
        userEmail: user.email,
        brand,
        country,
        amount: numericAmount,
      totalValue,
      referenceId: order.referenceId,
      });
    } catch (error) {
      // Keep the saved trade intact if Telegram is temporarily unavailable.
      console.error("Notification error:", error);
    }

    return NextResponse.json({ 
      message: "Order submitted successfully! Admin is reviewing.", 
      orderId: order.id,
      referenceId: order.referenceId,
      expectedPayout: totalValue,
      currency: "NGN",
      tradeRoom: `/trade/${order.id}`,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("Detailed Order creation error:", error);
    return NextResponse.json({ error: "We could not submit this gift-card trade. Please try again." }, { status: 500 });
  }
}
