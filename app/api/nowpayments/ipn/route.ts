// app/api/nowpayments/ipn/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This route listens for Instant Payment Notifications (IPNs) from NOWPayments
export async function POST(req: Request) {
  try {
    // 1. Get the data sent by NOWPayments
    const body = await req.json();
    console.log("🚨 NOWPayments IPN Received:", body);

    // 2. Extract the important details
    const { payout_id, payout_status, order_id, actually_sent, send_currency } = body;

    // 3. If the payout is finished, we can update our database!
    if (payout_status === 'finished' && order_id) {
      // Find the order by the order_id we generated earlier (payout_12345)
      // Note: For now, we just log it. Later we can update the order status to 'PAID_OUT'
      console.log(`✅ Payout ${payout_id} for order ${order_id} successfully finished! Sent ${actually_sent} ${send_currency}.`);
    } 
    
    if (payout_status === 'failed') {
      console.error(`❌ Payout ${payout_id} for order ${order_id} FAILED!`);
    }

    // 4. ALWAYS return a 200 OK status, otherwise NOWPayments will keep retrying!
    return NextResponse.json({ message: "IPN received successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error processing IPN:", error);
    // Still return 200 so NOWPayments doesn't spam us with retries if we crash
    return NextResponse.json({ message: "Error processing IPN" }, { status: 200 }); 
  }
}
