// app/api/admin/orders/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sendCryptoPayout } from '@/lib/nowpayments';
import { authOptions } from '@/lib/auth';
import { withAdminScope } from '@/lib/db-context';
import { getUsdToNairaRate } from '@/lib/pricing';
import { canVerifyTrades } from '@/lib/admin-access';
import { formatNaira, formatUsd } from '@/lib/currency';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canVerifyTrades(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const limited = await enforceRateLimit(`admin-orders-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
    if (limited) return limited;

    const pendingOrders = await withAdminScope((tx) => tx.order.findMany({
      where: { status: 'PENDING' },
      include: {
        user: { select: { email: true } } // Include user email so you know who sent it
      },
      orderBy: { createdAt: 'desc' } // Newest first
    }));

    return NextResponse.json(pendingOrders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !canVerifyTrades(session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const limited = await enforceRateLimit(`admin-orders-patch:${session.user.id}`, RATE_LIMITS.adminAction);
    if (limited) return limited;

    const body = await req.json();
    const { orderId, action } = body;
    const resultDescription = typeof body.resultDescription === "string" ? body.resultDescription.trim() : "";

    if (typeof orderId !== 'string' || !['APPROVE', 'REJECT', 'SUCCESS', 'FAIL'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    if ((action === "FAIL" || action === "REJECT") && (!resultDescription || resultDescription.length > 800)) {
      return NextResponse.json({ error: "Add a clear failure description (up to 800 characters)." }, { status: 400 });
    }

    const order = await withAdminScope((tx) => tx.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, cryptoWalletAddress: true } } },
    }));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (action === "SUCCESS" || action === "FAIL") {
      if (order.type !== "SELL_GIFTCARD") {
        return NextResponse.json({ error: "Use the withdrawal actions for crypto trades." }, { status: 400 });
      }

      const isSuccessful = action === "SUCCESS";

      // An admin can approve less than the full submitted card value (e.g. some
      // cards in a batch were invalid). The payout recalculates from the same rate.
      let approvedAmount = order.amount;
      let approvedTotalValue = order.totalValue;
      let isPartial = false;
      if (isSuccessful && typeof body.approvedAmount !== "undefined") {
        const parsedAmount = Number(body.approvedAmount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > order.amount) {
          return NextResponse.json({ error: `Enter an approved value between $0.01 and $${order.amount.toLocaleString()}.` }, { status: 400 });
        }
        approvedAmount = Math.round(parsedAmount * 100) / 100;
        approvedTotalValue = Math.round(approvedAmount * order.rate);
        isPartial = approvedAmount < order.amount;
      }

      if ((action === "FAIL" || isPartial) && (!resultDescription || resultDescription.length > 800)) {
        return NextResponse.json({ error: isPartial ? "Add a note explaining the adjusted payout (e.g. which card was invalid)." : "Add a clear failure description (up to 800 characters)." }, { status: 400 });
      }

      const result = await withAdminScope((tx) => tx.order.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: {
          status: isSuccessful ? "COMPLETED" : "REJECTED",
          ...(isSuccessful ? { amount: approvedAmount, totalValue: approvedTotalValue } : {}),
          resultDescription: isSuccessful ? (isPartial ? resultDescription : null) : resultDescription,
          resolvedAt: new Date(),
        },
      }));
      if (result.count !== 1) return NextResponse.json({ error: "This order has already been processed." }, { status: 409 });

      await withAdminScope((tx) => tx.tradeMessage.create({
        data: {
          orderId,
          senderId: session.user.id,
          body: isSuccessful
            ? (isPartial
              ? `Admin result: Your gift-card trade was partially successful. Approved value: ${formatUsd(approvedAmount)} of the ${formatUsd(order.amount)} submitted. Payout: ${formatNaira(approvedTotalValue)}. Reason: ${resultDescription}`
              : "Admin result: Your gift-card trade was successful. No further action is needed.")
            : `Admin result: Your gift-card trade failed. Reason: ${resultDescription}`,
        },
      }));
      return NextResponse.json({
        message: isSuccessful
          ? (isPartial ? "Gift-card trade marked successful with an adjusted payout." : "Gift-card trade marked successful.")
          : "Gift-card trade marked failed with the supplied reason.",
      }, { status: 200 });
    }

    if (action === 'APPROVE') {
      if (order.type === 'SELL_CRYPTO') {
        const approvedOrder = await withAdminScope((tx) => tx.order.updateMany({
          where: { id: orderId, status: 'PENDING' },
          data: { status: 'COMPLETED', resultDescription: null, resolvedAt: new Date() },
        }));
        if (approvedOrder.count !== 1) {
          return NextResponse.json({ error: 'This order has already been processed.' }, { status: 409 });
        }
        await withAdminScope((tx) => tx.tradeMessage.create({
          data: {
            orderId,
            senderId: session.user.id,
            body: "Admin result: Your crypto withdrawal was approved. Your saved bank account will be paid.",
          },
        }));
        return NextResponse.json({ message: 'Crypto withdrawal approved. Pay the saved default bank account.' }, { status: 200 });
      }

      if (!order.user.cryptoWalletAddress || order.user.cryptoWalletAddress.length < 10) {
        return NextResponse.json({ error: 'The user has not saved a valid USDT TRC20 payout wallet.' }, { status: 400 });
      }
      const walletAddress = order.user.cryptoWalletAddress;

      const nairaPerUsdt = await getUsdToNairaRate();

      const usdtAmount = Math.floor((order.totalValue / nairaPerUsdt) * 1_000_000) / 1_000_000;
      if (usdtAmount <= 0) {
        return NextResponse.json({ error: 'The approved value is too small for a USDT payout.' }, { status: 400 });
      }

      // Claim the order before calling the provider so it cannot be approved twice.
      const claimedOrder = await withAdminScope((tx) => tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'PROCESSING' },
      }));
      if (claimedOrder.count !== 1) {
        return NextResponse.json({ error: 'This order has already been processed.' }, { status: 409 });
      }

      try {
        const providerPayout = await sendCryptoPayout(usdtAmount, walletAddress);
        const providerReference = typeof providerPayout.id === 'string' || typeof providerPayout.id === 'number'
          ? String(providerPayout.id)
          : typeof providerPayout.batch_id === 'string' || typeof providerPayout.batch_id === 'number'
            ? String(providerPayout.batch_id)
            : null;

        await withAdminScope(async (tx) => {
          await tx.payout.create({
            data: {
              orderId: order.id,
              userId: order.user.id,
              walletAddress,
              nairaAmount: order.totalValue,
              cryptoAmount: usdtAmount,
              exchangeRate: nairaPerUsdt,
              providerReference,
              providerResponse: JSON.stringify(providerPayout),
            },
          });
          await tx.order.update({
            where: { id: orderId },
            // The order is settled only after NOWPayments sends a verified finished IPN.
            data: { status: 'PROCESSING' },
          });
        });
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
      const rejectedOrder = await withAdminScope((tx) => tx.order.updateMany({
        where: { id: orderId, status: 'PENDING' },
        data: { status: 'REJECTED', resultDescription, resolvedAt: new Date() },
      }));
      if (rejectedOrder.count !== 1) {
        return NextResponse.json({ error: 'This order has already been processed.' }, { status: 409 });
      }
      await withAdminScope((tx) => tx.tradeMessage.create({ data: { orderId, senderId: session.user.id, body: `Admin result: This trade failed. Reason: ${resultDescription}` } }));
      return NextResponse.json({ message: "Order rejected." }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error processing order:", error);
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 });
  }
}
