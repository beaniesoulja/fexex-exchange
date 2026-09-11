import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createEmailVerificationToken, EMAIL_VERIFICATION_WINDOW_MS, sendVerificationEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const isLocalDevelopment = process.env.NODE_ENV !== "production";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please log in to verify your email." }, { status: 401 });
  }
  const limited = await enforceRateLimit(`email-verify-request:${session.user.id}`, RATE_LIMITS.ticketCreate);
  if (limited) return limited;

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, emailVerified: true } });
    if (!user) return NextResponse.json({ error: "Your FEXEX account could not be found." }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ message: "Your email is already verified." });

    const recentToken = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recentToken) return NextResponse.json({ message: "A verification email was just sent. Check your inbox." });

    const { token, tokenHash } = createEmailVerificationToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_WINDOW_MS);
    const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
    const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    if (isLocalDevelopment) {
      await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
      return NextResponse.json({ message: "Your local verification link is ready.", verifyUrl });
    }

    await sendVerificationEmail(user.email, verifyUrl);
    await prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

    return NextResponse.json({ message: "Verification email sent. Check your inbox." });
  } catch (error) {
    console.error("Email verification request failed:", error);
    return NextResponse.json({ error: "We could not send a verification email right now. Please try again." }, { status: 500 });
  }
}
