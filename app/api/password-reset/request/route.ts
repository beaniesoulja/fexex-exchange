import { NextResponse } from "next/server";

import { createPasswordResetToken, PASSWORD_RESET_WINDOW_MS, sendPasswordResetEmail } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const genericResponse = { message: "If an account matches that email, you will receive reset instructions shortly." };

export async function POST(request: Request) {
  let body: { email?: unknown; captchaToken?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(genericResponse, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!emailPattern.test(email) || email.length > 320) {
    return NextResponse.json(genericResponse, { status: 200 });
  }
  if (!(await verifyTurnstileToken(body.captchaToken, "password_reset"))) {
    return NextResponse.json(genericResponse, { status: 200 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
    if (!user) return NextResponse.json(genericResponse, { status: 200 });

    const recentToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recentToken) return NextResponse.json(genericResponse, { status: 200 });

    const { token, tokenHash } = createPasswordResetToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);
    const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await sendPasswordResetEmail(user.email, resetUrl);
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  return NextResponse.json(genericResponse, { status: 200 });
}
