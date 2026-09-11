import { NextResponse } from "next/server";

import { hashEmailVerificationToken } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(`email-verify-confirm:${getClientIp(request)}`, RATE_LIMITS.tokenConfirm);
  if (limited) return limited;

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide a valid verification link." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  if (!token || token.length > 2048) {
    return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
  }

  try {
    const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashEmailVerificationToken(token) } });
    if (!verificationToken || verificationToken.expiresAt <= new Date()) {
      return NextResponse.json({ error: "This verification link is invalid or has expired." }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: verificationToken.userId }, data: { emailVerified: new Date() } }),
      prisma.emailVerificationToken.deleteMany({ where: { userId: verificationToken.userId } }),
    ]);

    return NextResponse.json({ message: "Email verified successfully." }, { status: 200 });
  } catch (error) {
    console.error("Email verification confirmation failed:", error);
    return NextResponse.json({ error: "We could not verify your email. Please try again." }, { status: 500 });
  }
}
