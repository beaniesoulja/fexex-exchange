// app/api/admin/orders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all pending orders for you to review
export async function GET() {
  try {
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

// PATCH: Approve or Reject an order
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { orderId, action } = body; // action will be 'APPROVE' or 'REJECT'

    const order = await prisma.order.findUnique({ 
      where: { id: orderId },
      include: { user: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === 'APPROVE') {
      // Use a transaction to ensure BOTH the order updates AND the wallet is credited
      await prisma.$transaction([
        // 1. Update order status
        prisma.order.update({
          where: { id: orderId },
          data: { status: 'COMPLETED' }
        }),
        // 2. Credit the user's wallet (create wallet if it doesn't exist yet)
        prisma.wallet.upsert({
          where: { userId: order.userId },
          update: { fiatBalance: { increment: order.totalValue } },
          create: { 
            userId: order.userId, 
            fiatBalance: order.totalValue,
            cryptoBalance: 0.0
          }
        })
      ]);
      
      return NextResponse.json({ message: "Order approved and user wallet credited!" }, { status: 200 });
    } 
    
    if (action === 'REJECT') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'REJECTED' }
      });
      return NextResponse.json({ message: "Order rejected." }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error processing order:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}