import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide a valid password reset form." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || token.length > 2048 || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "This reset link or password is invalid." }, { status: 400 });
  }

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashPasswordResetToken(token) } });
    if (!resetToken || resetToken.expiresAt <= new Date()) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return NextResponse.json({ message: "Password updated successfully." }, { status: 200 });
  } catch (error) {
    console.error("Password reset confirmation failed:", error);
    return NextResponse.json({ error: "We could not reset your password. Please try again." }, { status: 500 });
  }
}
