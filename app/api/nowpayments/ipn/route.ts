// app/api/nowpayments/ipn/route.ts
import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sortObject((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }
  return value;
}

function hasValidSignature(payload: unknown, signature: string | null, secret: string) {
  if (!signature) return false;

  const expected = createHmac('sha512', secret)
    .update(JSON.stringify(sortObject(payload)))
    .digest('hex');
  const received = Buffer.from(signature, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');

  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

// This route listens for Instant Payment Notifications (IPNs) from NOWPayments
export async function POST(req: Request) {
  try {
    const ipnKey = process.env.NOWPAYMENTS_IPN_KEY;
    if (!ipnKey) {
      console.error('NOWPayments IPN key is missing.');
      return NextResponse.json({ error: 'IPN configuration is incomplete' }, { status: 500 });
    }

    const body: unknown = await req.json();
    const signature = req.headers.get('x-nowpayments-sig');
    if (!hasValidSignature(body, signature, ipnKey)) {
      console.warn('Rejected NOWPayments IPN with an invalid signature.');
      return NextResponse.json({ error: 'Invalid IPN signature' }, { status: 401 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid IPN payload' }, { status: 400 });
    }

    const { payout_id, payout_status, order_id, actually_sent, send_currency } = body as {
      payout_id?: string | number;
      payout_status?: string;
      order_id?: string;
      actually_sent?: string | number;
      send_currency?: string;
    };
    const providerReference = payout_id === undefined ? null : String(payout_id);

    if (providerReference && payout_status === 'finished') {
      const payout = await prisma.payout.findFirst({ where: { providerReference } });
      if (!payout) {
        console.warn(`Received a completed payout IPN for an unknown reference: ${providerReference}`);
      } else {
        await prisma.$transaction([
          prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'COMPLETED', providerResponse: JSON.stringify(body) },
          }),
          prisma.order.update({
            where: { id: payout.orderId },
            data: { status: 'COMPLETED' },
          }),
        ]);
        console.log(`NOWPayments payout ${providerReference} completed: ${actually_sent ?? 'unknown'} ${send_currency ?? ''}`);
      }
    }

    if (providerReference && payout_status === 'failed') {
      const payout = await prisma.payout.findFirst({ where: { providerReference } });
      if (!payout) {
        console.warn(`Received a failed payout IPN for an unknown reference: ${providerReference}`);
      } else {
        await prisma.$transaction([
          prisma.payout.update({
            where: { id: payout.id },
            data: { status: 'FAILED', providerResponse: JSON.stringify(body) },
          }),
          prisma.order.update({
            where: { id: payout.orderId },
            data: { status: 'PENDING' },
          }),
        ]);
        console.error(`NOWPayments payout ${providerReference} failed for order ${order_id ?? payout.orderId}.`);
      }
    }

    return NextResponse.json({ message: "IPN received successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error processing IPN:", error);
    return NextResponse.json({ error: "Error processing IPN" }, { status: 500 });
  }
}
