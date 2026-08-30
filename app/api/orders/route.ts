// app/api/orders/route.ts
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensurePricingDefaults } from '@/lib/pricing';

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

    if (typeof brand !== 'string' || typeof country !== 'string' || country.length > 80) {
      return NextResponse.json({ error: "Choose a supported gift card for a Naira payout." }, { status: 400 });
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
          giftCardCode: `${cardCode || 'N/A'} | ${cardPin || 'N/A'}`,
          giftCardImage: imageBase64,
        },
      });

      await tx.userActivity.create({
        data: {
          userId: user.id,
          orderId: savedOrder.id,
          type: 'TRADE_SUBMITTED',
          details: `Submitted ${brand} gift card for ${numericAmount} USD.`,
        },
      });

      await tx.tradeMessage.create({
        data: { orderId: savedOrder.id, senderId: user.id, body: "Gift card submitted. I am ready for Admin review." },
      });

      return savedOrder;
    });
    try {
      await notifyAdmin({
        userEmail: user.email,
        brand,
        country,
        amount: numericAmount,
        totalValue,
      });
    } catch (error) {
      // Keep the saved trade intact if Telegram is temporarily unavailable.
      console.error("Notification error:", error);
    }

    return NextResponse.json({ 
      message: "Order submitted successfully! Admin is reviewing.", 
      orderId: order.id,
      expectedPayout: totalValue,
      currency: "NGN",
      tradeRoom: `/trade/${order.id}`,
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("❌ Detailed Order creation error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
