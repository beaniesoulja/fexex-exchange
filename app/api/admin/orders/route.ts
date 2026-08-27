// app/api/admin/orders/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sendCryptoPayout } from '@/lib/nowpayments';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingOrders = await prisma.order.findMany({
      where: { status: 'PENDING' },
      include: { 
        user: { select: { email: true } } // Include user email so you know who sent it
      },
      orderBy: { createdAt: 'desc' } // Newest first
    });

    return NextResponse.json(pendingOrders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, action } = body; // action will be 'APPROVE' or 'REJECT'

    if (typeof orderId !== 'string' || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { user: { select: { id: true, cryptoWalletAddress: true } } },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === 'APPROVE') {
      if (!order.user.cryptoWalletAddress || order.user.cryptoWalletAddress.length < 10) {
        return NextResponse.json({ error: 'The user has not saved a valid USDT TRC20 payout wallet.' }, { status: 400 });
      }

      const nairaPerUsdt = Number(process.env.USDT_TO_NGN_RATE);
      if (!Number.isFinite(nairaPerUsdt) || nairaPerUsdt <= 0) {
        return NextResponse.json({ error: 'The USDT-to-Naira payout rate is not configured.' }, { status: 503 });
      }

      const usdtAmount = Math.floor((order.totalValue / nairaPerUsdt) * 1_000_000) / 1_000_000;
      if (usdtAmount <= 0) {
        return NextResponse.json({ error: 'The approved value is too small for a USDT payout.' }, { status: 400 });
      }

      // Claim the order before calling the provider so it cannot be approved twice.
      const claimedOrder = await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      });
      if (claimedOrder.count !== 1) {
        return NextResponse.json({ error: 'This order has already been processed.' }, { status: 409 });
      }

      try {
        const providerPayout = await sendCryptoPayout(usdtAmount, order.user.cryptoWalletAddress);
        const providerReference = typeof providerPayout.id === 'string' || typeof providerPayout.id === 'number'
          ? String(providerPayout.id)
          : typeof providerPayout.batch_id === 'string' || typeof providerPayout.batch_id === 'number'
            ? String(providerPayout.batch_id)
            : null;

        await prisma.$transaction([
          prisma.payout.create({
            data: {
              orderId: order.id,
              userId: order.user.id,
              walletAddress: order.user.cryptoWalletAddress,
              nairaAmount: order.totalValue,
              cryptoAmount: usdtAmount,
              exchangeRate: nairaPerUsdt,
              providerReference,
              providerResponse: JSON.stringify(providerPayout),
            },
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status: 'COMPLETED' },
          }),
        ]);
      } catch (error) {
        console.error('Payout initiation failed. Order remains PROCESSING for manual review:', error);
        return NextResponse.json(
          { error: 'Payout could not be initiated. The order is held for manual review to prevent a duplicate payment.' },
          { status: 502 },
        );
      }
      
      return NextResponse.json({ message: 'USDT payout initiated successfully.' }, { status: 200 });
    } 
    
    if (action === 'REJECT') {
      const rejectedOrder = await prisma.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      if (rejectedOrder.count !== 1) {
        return NextResponse.json({ error: 'This order has already been processed.' }, { status: 409 });
      }
      return NextResponse.json({ message: "Order rejected." }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error processing order:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}
