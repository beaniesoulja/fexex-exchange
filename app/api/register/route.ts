import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function duplicateFieldResponse(field: "username" | "phoneNumber" | "email") {
  const messages = {
    username: "That username is already taken. Choose a suggestion or try another one.",
    phoneNumber: "That phone number is already registered. Use a different phone number or log in to your account.",
    email: "That email address is already registered. Log in or reset your password.",
  };

  return NextResponse.json({ error: messages[field], field }, { status: 409 });
}

export async function POST(request: Request) {
  let body: { username?: unknown; legalName?: unknown; phoneCountryCode?: unknown; phoneNumber?: unknown; email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please provide a valid registration form." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const legalName = typeof body.legalName === "string" ? body.legalName.trim().replace(/\s+/g, " ") : "";
  const phoneCountryCode = typeof body.phoneCountryCode === "string" ? `+${body.phoneCountryCode.replace(/\D/g, "").slice(0, 3)}` : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "") : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "Choose a username with 3–24 letters, numbers, or underscores." }, { status: 400 });
  }

  if (legalName.length < 2 || legalName.length > 120 || legalName.split(" ").length < 2) {
    return NextResponse.json({ error: "Enter your first and last legal names as they appear on your government ID." }, { status: 400 });
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

    await prisma.user.create({
      data: {
        email,
        username,
        legalName,
        phoneCountryCode,
        phoneNumber,
        passwordHash,
        wallet: { create: {} },
      },
    });

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
