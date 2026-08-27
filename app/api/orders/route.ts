// app/api/orders/route.ts
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please log in to submit a gift card." }, { status: 401 });
    }

    const { brand, country, amount, cardCode, cardPin, imageBase64 } = body;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Your Fexex account could not be found." }, { status: 404 });
    }

    // Naira-only gift card payout percentages.
    const rates: Record<string, number> = {
      "iTunes_NG": 0.85,
      "Amazon_NG": 0.90,
      "Steam_NG": 0.80
    };

    const rateKey = `${brand}_${country}`;
    const rate = rates[rateKey];

    if (!rate) {
      return NextResponse.json({ error: "We currently support Naira payouts for iTunes, Amazon, and Steam gift cards." }, { status: 400 });
    }

    const numericAmount = Math.round(Number(amount));
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      return NextResponse.json({ error: "Enter a valid gift card value in Naira." }, { status: 400 });
    }
    const totalValue = Math.round(numericAmount * rate);

    // 4. Save the order AND the image to the database
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        type: 'SELL_GIFTCARD',
        status: 'PENDING',
        amount: numericAmount,
        rate: rate,
        totalValue: totalValue,
        giftCardBrand: brand,
        giftCardCountry: country,
        giftCardCode: `${cardCode || 'N/A'} | ${cardPin || 'N/A'}`, 
        giftCardImage: imageBase64, // <-- THIS IS THE FIX: Save the actual Base64 image!
      }
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
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("❌ Detailed Order creation error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
