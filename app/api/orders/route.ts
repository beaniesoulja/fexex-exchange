// app/api/orders/route.ts
import { notifyAdmin } from '@/lib/notify';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Extract the imageBase64 from the frontend payload
    const { userId, brand, country, amount, cardCode, cardPin, imageBase64 } = body;

    // 2. Auto-create user if they don't exist
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `test_${userId}@example.com`,
        passwordHash: "dummy_hash_for_testing",
        role: "USER",
        kycVerified: true,
      },
    });

    // 3. Define your buy rates
    const rates: Record<string, number> = {
      "iTunes_US": 0.85,
      "Amazon_US": 0.90,
      "Steam_US": 0.80
    };

    const rateKey = `${brand}_${country}`;
    const rate = rates[rateKey];

    if (!rate) {
      return NextResponse.json({ error: "We do not currently buy this card type." }, { status: 400 });
    }

    const numericAmount = Number(amount);
    const totalValue = numericAmount * rate;

    // 4. Save the order AND the image to the database
    const order = await prisma.order.create({
      data: {
        userId: userId, 
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
      expectedPayout: totalValue
    }, { status: 201 });

  } catch (error: unknown) {
    console.error("❌ Detailed Order creation error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
