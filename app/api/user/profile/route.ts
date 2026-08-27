// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Get the logged-in user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the user, their wallet, and their orders from the database
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        wallet: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Get the 10 most recent orders
        },
        swaps: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      }
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: userData.email,
      kycVerified: userData.kycVerified,
      cryptoWalletAddress: userData.cryptoWalletAddress,
      wallet: userData.wallet || { fiatBalance: 0, cryptoBalance: 0 },
      orders: userData.orders,
      swaps: userData.swaps,
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";

    if (walletAddress.length < 10) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { cryptoWalletAddress: walletAddress },
    });

    return NextResponse.json({ message: "Wallet address saved successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Failed to save wallet:", error);
    return NextResponse.json({ error: "Failed to save wallet" }, { status: 500 });
  }
}
