// app/api/user/profile/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NIGERIAN_BANKS } from '@/lib/nigerian-banks';
import { prisma } from '@/lib/prisma';
import { validateImageDataUrl } from '@/lib/image-upload';
import { withUserScope } from '@/lib/db-context';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const MINIMUM_AGE_YEARS = 18;
const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

function isAtLeastMinimumAge(dateOfBirth: Date) {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - MINIMUM_AGE_YEARS);
  return dateOfBirth <= cutoff;
}

export async function GET(request: Request) {
  try {
    // 1. Get the logged-in user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limited = await enforceRateLimit(`profile-get:${session.user.id}`, RATE_LIMITS.authedReadFast);
    if (limited) return limited;

    const accountOnly = new URL(request.url).searchParams.get("scope") === "account";

    // The profile screen only needs account data. Avoid holding its identity fields
    // behind wallet, orders, and swaps queries that belong to the dashboard.
    if (accountOnly) {
      const userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          email: true,
          username: true,
          usernameChangedAt: true,
          legalName: true,
          dateOfBirth: true,
          dateOfBirthChangedAt: true,
          avatarData: true,
          bio: true,
          nameDisplay: true,
          preferredCurrency: true,
          timezone: true,
          phoneCountryCode: true,
          phoneNumber: true,
          kycVerified: true,
          cryptoWalletAddress: true,
          bankName: true,
          bankAccountNumber: true,
        },
      });

      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(userData, { status: 200 });
    }

    // Dashboard consumers need the wallet, orders, and swaps in addition to the account.
    const userData = await withUserScope(session.user.id, (tx) => tx.user.findUnique({
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
    }));

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: userData.email,
      username: userData.username,
      usernameChangedAt: userData.usernameChangedAt,
      legalName: userData.legalName,
      dateOfBirth: userData.dateOfBirth,
      dateOfBirthChangedAt: userData.dateOfBirthChangedAt,
      avatarData: userData.avatarData,
      bio: userData.bio, nameDisplay: userData.nameDisplay, preferredCurrency: userData.preferredCurrency, timezone: userData.timezone,
      phoneCountryCode: userData.phoneCountryCode,
      phoneNumber: userData.phoneNumber,
      kycVerified: userData.kycVerified,
      cryptoWalletAddress: userData.cryptoWalletAddress,
      bankName: userData.bankName,
      bankAccountNumber: userData.bankAccountNumber,
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
    const limited = await enforceRateLimit(`profile-post:${session.user.id}`, RATE_LIMITS.accountWrite);
    if (limited) return limited;

    const body = await req.json();
    const avatarData = typeof body.avatarData === "string" ? body.avatarData : "";
    const walletAddress = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
    const bankName = typeof body.bankName === "string" ? body.bankName.trim() : "";
    const bankAccountNumber = typeof body.bankAccountNumber === "string" ? body.bankAccountNumber.replace(/\s/g, "") : "";
    if (body.preferences) {
      const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const phoneCountryCode = typeof body.phoneCountryCode === "string" ? `+${body.phoneCountryCode.replace(/\D/g, "").slice(0, 3)}` : "";
      const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.replace(/\D/g, "") : "";
      const dateOfBirthValue = typeof body.dateOfBirth === "string" ? body.dateOfBirth.trim() : "";
      const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 180) : "";
      const nameDisplay = ["INITIALS", "FULL_NAME", "USERNAME"].includes(body.nameDisplay) ? body.nameDisplay : "USERNAME";
      const preferredCurrency = body.preferredCurrency === "USD" ? "USD" : "NGN";
      const timezone = typeof body.timezone === "string" ? body.timezone.trim() : "Africa/Lagos";

      if (!/^[a-z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: "Choose a username with 3–24 letters, numbers, or underscores.", field: "username" }, { status: 400 });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return NextResponse.json({ error: "Enter a valid email address.", field: "email" }, { status: 400 });
      if (!/^\+\d{1,3}$/.test(phoneCountryCode) || !/^\d{10}$/.test(phoneNumber)) return NextResponse.json({ error: "Enter a valid country code and 10-digit phone number.", field: "phoneNumber" }, { status: 400 });
      try { Intl.DateTimeFormat("en", { timeZone: timezone }); } catch { return NextResponse.json({ error: "Choose a valid timezone.", field: "timezone" }, { status: 400 }); }

      const current = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

      let dateOfBirth: Date | undefined;
      if (dateOfBirthValue) {
        const isoMatch = dateOfBirthValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const shortMatch = dateOfBirthValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        const parsedYear = isoMatch
          ? Number(isoMatch[1])
          : shortMatch
            ? Number(shortMatch[3])
            : NaN;
        const parsedMonth = Number(isoMatch?.[2] ?? shortMatch?.[2]);
        const parsedDay = Number(isoMatch?.[3] ?? shortMatch?.[1]);
        const normalizedDate = `${parsedYear.toString().padStart(4, "0")}-${parsedMonth.toString().padStart(2, "0")}-${parsedDay.toString().padStart(2, "0")}`;
        dateOfBirth = new Date(`${normalizedDate}T12:00:00.000Z`);
        if (!Number.isFinite(parsedYear) || Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== normalizedDate || dateOfBirth > new Date()) {
          return NextResponse.json({ error: "Enter your date of birth as DD-MM-YYYY, for example 29-08-1995.", field: "dateOfBirth" }, { status: 400 });
        }
        if (!isAtLeastMinimumAge(dateOfBirth)) {
          return NextResponse.json({ error: `You must be at least ${MINIMUM_AGE_YEARS} years old to use FEXEX.`, field: "dateOfBirth" }, { status: 400 });
        }
      }

      const usernameChanged = username !== current.username;
      if (usernameChanged && current.username && current.usernameChangedAt) {
        const nextChangeAt = new Date(current.usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        if (nextChangeAt > new Date()) {
          const daysLeft = Math.max(1, Math.ceil((nextChangeAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
          return NextResponse.json({ error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`, field: "username" }, { status: 400 });
        }
      }

      const dateOfBirthChanged = Boolean(
        dateOfBirth && (!current.dateOfBirth || current.dateOfBirth.toISOString().slice(0, 10) !== dateOfBirth.toISOString().slice(0, 10)),
      );
      if (dateOfBirthChanged && current.dateOfBirth && current.dateOfBirthChangedAt) {
        return NextResponse.json({ error: "Your date of birth has already been changed once and is now locked.", field: "dateOfBirth" }, { status: 400 });
      }
      const conflict = await prisma.user.findFirst({
        where: { id: { not: current.id }, OR: [{ username }, { email }, { phoneCountryCode, phoneNumber }] },
        select: { username: true, email: true, phoneCountryCode: true, phoneNumber: true },
      });
      if (conflict?.username === username) return NextResponse.json({ error: "That username is already taken.", field: "username" }, { status: 409 });
      if (conflict?.email === email) return NextResponse.json({ error: "That email address is already registered.", field: "email" }, { status: 409 });
      if (conflict?.phoneCountryCode === phoneCountryCode && conflict.phoneNumber === phoneNumber) return NextResponse.json({ error: "That phone number is already registered.", field: "phoneNumber" }, { status: 409 });

      const emailChanged = email !== current.email;
      const avatarStatus = current.avatarData ? "avatar uploaded" : "no avatar uploaded";
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_user_id', ${current.id}, true), set_config('app.is_admin', 'false', true)`;
        await tx.user.update({
          where: { id: current.id },
          data: {
            username, email, phoneCountryCode, phoneNumber, bio, nameDisplay, preferredCurrency, timezone,
            ...(dateOfBirth ? { dateOfBirth } : {}),
            ...(dateOfBirthChanged && current.dateOfBirth ? { dateOfBirthChangedAt: new Date() } : {}),
            ...(usernameChanged && current.username ? { usernameChangedAt: new Date() } : {}),
          },
        });
        if (emailChanged) {
          await tx.profileAudit.create({
            data: {
              userId: current.id,
              type: "EMAIL_CHANGED",
              details: `Email changed by ${current.legalName ?? "User"}; previous email: ${current.email}; new email: ${email}; phone: ${phoneCountryCode} ${phoneNumber}; ${avatarStatus}.`,
            },
          });
        }
      });
      return NextResponse.json({ message: "Profile saved.", username, usernameChangedAt: usernameChanged && current.username ? new Date() : current.usernameChangedAt, email, phoneCountryCode, phoneNumber, bio, nameDisplay, preferredCurrency, timezone, dateOfBirth: dateOfBirth ?? current.dateOfBirth, dateOfBirthChangedAt: dateOfBirthChanged && current.dateOfBirth ? new Date() : current.dateOfBirthChangedAt });
    }

    if (avatarData) {
      const validatedAvatar = validateImageDataUrl(avatarData, 1_000_000);
      if (!validatedAvatar) {
        return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image smaller than 1 MB." }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: { avatarData: validatedAvatar },
      });

      return NextResponse.json({ message: "Profile photo saved successfully!", avatarData: validatedAvatar }, { status: 200 });
    }

    if (walletAddress) {
      if (walletAddress.length < 10) {
        return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
      }

      await prisma.user.update({
        where: { id: session.user.id },
        data: { cryptoWalletAddress: walletAddress },
      });

      return NextResponse.json({ message: "Wallet address saved successfully!" }, { status: 200 });
    }

    if (!(NIGERIAN_BANKS as readonly string[]).includes(bankName) || !/^\d{10}$/.test(bankAccountNumber)) {
      return NextResponse.json({ error: "Choose a bank and enter a valid 10-digit account number." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { bankName, bankAccountNumber },
    });

    return NextResponse.json({ message: "Bank details saved successfully!" }, { status: 200 });
  } catch (error) {
    console.error("Failed to save payout details:", error);
    return NextResponse.json({ error: "Failed to save payout details" }, { status: 500 });
  }
}
