import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { withAdminScope } from "@/lib/db-context";
import { createEmailVerificationToken, EMAIL_VERIFICATION_WINDOW_MS, sendVerificationEmail } from "@/lib/email-verification";
import { getClientIp, rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";

const isLocalDevelopment = process.env.NODE_ENV !== "production";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINIMUM_AGE_YEARS = 18;

function isAtLeastMinimumAge(dateOfBirth: Date) {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - MINIMUM_AGE_YEARS);
  return dateOfBirth <= cutoff;
}

function duplicateFieldResponse(field: "username" | "phoneNumber" | "email") {
  const messages = {
    username: "That username is already taken. Choose a suggestion or try another one.",
    phoneNumber: "That phone number is already registered. Use a different phone number or log in to your account.",
    email: "That email address is already registered. Log in or reset your password.",
  };

  return NextResponse.json({ error: messages[field], field }, { status: 409 });
}

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = await rateLimit(`register:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return tooManyRequestsResponse(retryAfterSeconds, "Too many signup attempts from this connection. Please try again later.");
  }

  let body: { username?: unknown; legalName?: unknown; dateOfBirth?: unknown; phoneCountryCode?: unknown; phoneNumber?: unknown; email?: unknown; password?: unknown; agreedToTerms?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide a valid registration form." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const legalName = typeof body.legalName === "string" ? body.legalName.trim().replace(/\s+/g, " ") : "";
  const dateOfBirthValue = typeof body.dateOfBirth === "string" ? body.dateOfBirth : "";
  const dateOfBirth = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirthValue) ? new Date(`${dateOfBirthValue}T12:00:00.000Z`) : null;
  const phoneCountryCode = typeof body.phoneCountryCode === "string" ? `+${body.phoneCountryCode.replace(/\D/g, "").slice(0, 3)}` : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "") : "";
  const password = typeof body.password === "string" ? body.password : "";
  const agreedToTerms = body.agreedToTerms === true;

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Choose a username with 3–24 letters, numbers, or underscores." }, { status: 400 });
  }

  if (legalName.length < 2 || legalName.length > 120 || legalName.split(" ").length < 2) {
    return NextResponse.json({ error: "Enter your first and last legal names as they appear on your government ID." }, { status: 400 });
  }

  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(legalName)) {
    return NextResponse.json({ error: "Your legal name can only contain letters." }, { status: 400 });
  }

  if (!dateOfBirth || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== dateOfBirthValue || dateOfBirth > new Date()) {
    return NextResponse.json({ error: "Enter a valid date of birth." }, { status: 400 });
  }

  if (!isAtLeastMinimumAge(dateOfBirth)) {
    return NextResponse.json({ error: `You must be at least ${MINIMUM_AGE_YEARS} years old to create a FEXEX account.` }, { status: 400 });
  }

  if (!/^\+\d{1,3}$/.test(phoneCountryCode) || !/^\d{10}$/.test(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid country code and a 10-digit phone number." }, { status: 400 });
  }

  if (!emailPattern.test(email) || email.length > 320) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Your password must be 8 to 128 characters." }, { status: 400 });
  }

  if (!agreedToTerms) {
    return NextResponse.json({ error: "You must agree to the Terms of Use and Privacy Policy to create an account." }, { status: 400 });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
          { phoneCountryCode, phoneNumber },
        ],
      },
      select: { username: true, email: true, phoneCountryCode: true, phoneNumber: true },
    });

    if (existingUser?.username === username) {
      return duplicateFieldResponse("username");
    }

    if (existingUser?.email === email) {
      return duplicateFieldResponse("email");
    }

    if (existingUser?.phoneCountryCode === phoneCountryCode && existingUser.phoneNumber === phoneNumber) {
      return duplicateFieldResponse("phoneNumber");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // No signed-in user exists yet to scope this to — creating an account
    // (and its wallet) is a bootstrap operation, not access to anyone's data.
    const createdUser = await withAdminScope((tx) => tx.user.create({
      data: {
        email,
        username,
        legalName,
        dateOfBirth,
        phoneCountryCode,
        phoneNumber,
        passwordHash,
        termsAcceptedAt: new Date(),
        wallet: { create: {} },
        mailingListSubscriber: {
          create: { email, source: "signup" },
        },
      },
    }));

    // A failed verification email should never block account creation —
    // the user can always resend it from the Verification page.
    try {
      const { token, tokenHash } = createEmailVerificationToken();
      const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_WINDOW_MS);
      const origin = process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
      const verifyUrl = `${origin}/verify-email?token=${encodeURIComponent(token)}`;
      await prisma.emailVerificationToken.create({ data: { userId: createdUser.id, tokenHash, expiresAt } });
      if (!isLocalDevelopment) await sendVerificationEmail(email, verifyUrl);
    } catch (error) {
      console.error("Could not send the initial verification email:", error);
    }

    return NextResponse.json({ message: "Account created." }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];

      if (target.includes("username")) {
        return duplicateFieldResponse("username");
      }

      if (target.includes("email")) {
        return duplicateFieldResponse("email");
      }

      if (target.includes("phoneCountryCode") || target.includes("phoneNumber")) {
        return duplicateFieldResponse("phoneNumber");
      }

      return NextResponse.json({ error: "A username, phone number, or email address is already registered." }, { status: 409 });
    }

    console.error("Registration error:", error);
    return NextResponse.json({ error: "We could not create your account. Please try again." }, { status: 500 });
  }
}
