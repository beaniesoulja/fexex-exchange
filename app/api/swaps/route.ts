import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ASSET = "USDT";
const MINIMUM_SWAP_AMOUNT = 0.01;
const CRYPTO_PRECISION = 1_000_000;

function getUsdtToNairaRate() {
  const rate = Number(process.env.USDT_TO_NGN_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = getUsdtToNairaRate();
  return NextResponse.json({
    asset: ASSET,
    currency: "NGN",
    rate,
    minimumAmount: MINIMUM_SWAP_AMOUNT,
    available: rate !== null,
  });
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = getUsdtToNairaRate();
    if (rate === null) {
      return NextResponse.json(
        { error: "Crypto-to-Naira swaps are temporarily unavailable. Please try again later." },
        { status: 503 },
      );
    }

    const body = await req.json();
    const requestedAmount = Number(body.amount);
    if (!Number.isFinite(requestedAmount) || requestedAmount < MINIMUM_SWAP_AMOUNT) {
      return NextResponse.json(
        { error: `Enter at least ${MINIMUM_SWAP_AMOUNT} ${ASSET}.` },
        { status: 400 },
      );
    }

    const cryptoAmount = Math.round(requestedAmount * CRYPTO_PRECISION) / CRYPTO_PRECISION;
    const nairaAmount = Math.floor(cryptoAmount * rate);
    if (nairaAmount < 1) {
      return NextResponse.json({ error: "This amount is too small to convert to Naira." }, { status: 400 });
    }

    const swap = await prisma.$transaction(async (tx) => {
      // This conditional update prevents a balance from being spent twice.
      const debit = await tx.wallet.updateMany({
        where: {
          userId: session.user.id,
          cryptoBalance: { gte: cryptoAmount },
        },
        data: {
          cryptoBalance: { decrement: cryptoAmount },
          fiatBalance: { increment: nairaAmount },
        },
      });

      if (debit.count !== 1) {
        return null;
      }

      return tx.swap.create({
        data: {
          userId: session.user.id,
          asset: ASSET,
          cryptoAmount,
          nairaAmount,
          rate,
        },
      });
    });

    if (!swap) {
      return NextResponse.json({ error: "You do not have enough USDT to complete this swap." }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: session.user.id } });
    return NextResponse.json({ message: "USDT swapped to Naira.", swap, wallet }, { status: 201 });
  } catch (error) {
    console.error("Failed to swap USDT to Naira:", error);
    return NextResponse.json({ error: "We could not complete the swap. Please try again." }, { status: 500 });
  }
}
