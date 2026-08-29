// lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Role } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyTurnstileToken } from "@/lib/turnstile";
import bcrypt from "bcryptjs";

function usernameFromEmail(email: string) {
  const localPart = email.split("@", 1)[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_") ?? "";
  return (localPart.length >= 3 ? localPart : "fexex_user").slice(0, 24);
}

function hasBcryptPasswordHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

function matchesLegacyPassword(input: string, storedValue: string) {
  const inputBuffer = Buffer.from(input);
  const storedBuffer = Buffer.from(storedValue);
  return inputBuffer.length === storedBuffer.length && timingSafeEqual(inputBuffer, storedBuffer);
}

function getRequestHeader(request: unknown, name: string) {
  const headers = request && typeof request === "object"
    ? (request as { headers?: unknown }).headers
    : undefined;
  if (!headers) return null;

  if (typeof (headers as { get?: unknown }).get === "function") {
    const value = (headers as { get: (key: string) => unknown }).get(name);
    return typeof value === "string" ? value : null;
  }

  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());
    return typeof entry?.[1] === "string" ? entry[1] : null;
  }

  if (typeof headers === "object") {
    const record = headers as Record<string, unknown>;
    const value = record[name] ?? record[name.toLowerCase()];
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
    return typeof value === "string" ? value : null;
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Turnstile token", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or username and password");
        }

        if (!(await verifyTurnstileToken(credentials.captchaToken, "login"))) {
          throw new Error("Bot verification failed");
        }

        // 1. Find the user in the database
        const identifier = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { username: { equals: identifier, mode: "insensitive" } },
            ],
          },
        });

        if (!user) {
          if (process.env.NODE_ENV !== "production") console.info("[auth] sign-in rejected: account not found");
          throw new Error("No user found with this email");
        }

        // 2. Check if the password matches the hashed password in the database
        const usesLegacyPasswordFormat = !hasBcryptPasswordHash(user.passwordHash);
        const isPasswordValid = usesLegacyPasswordFormat
          ? matchesLegacyPassword(credentials.password, user.passwordHash)
          : await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          if (process.env.NODE_ENV !== "production") console.info("[auth] sign-in rejected: password mismatch");
          throw new Error("Invalid password");
        }

        let username = user.username;
        if (!username) {
          const baseUsername = usernameFromEmail(user.email);
          const existingUsername = await prisma.user.findUnique({ where: { username: baseUsername }, select: { id: true } });
          username = !existingUsername || existingUsername.id === user.id
            ? baseUsername
            : `${baseUsername.slice(0, 17)}_${user.id.slice(-6)}`;
        }

        const now = new Date();
        const userAgent = getRequestHeader(request, "user-agent") ?? "Unknown browser";
        const browser = /Chrome\//.test(userAgent) ? "Chrome" : /Safari\//.test(userAgent) ? "Safari" : /Firefox\//.test(userAgent) ? "Firefox" : "Unknown browser";
        const os = /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : "Unknown OS";
        const forwarded = getRequestHeader(request, "x-forwarded-for");
        const ipAddress = forwarded?.split(",")[0]?.trim() ?? getRequestHeader(request, "x-real-ip");
        const upgradedPasswordHash = usesLegacyPasswordFormat ? await bcrypt.hash(credentials.password, 12) : undefined;
        // Account identity and a legacy-password upgrade are required for a successful login.
        // Activity telemetry is useful, but a telemetry problem must never reject valid credentials.
        await prisma.user.update({
          where: { id: user.id },
          data: { username, lastLoginAt: now, lastActiveAt: now, ...(upgradedPasswordHash ? { passwordHash: upgradedPasswordHash } : {}) },
        });

        await Promise.all([
          prisma.userActivity.create({ data: { userId: user.id, type: "LOGIN" } }),
          prisma.loginSession.create({ data: { userId: user.id, browser, os, ipAddress } }),
        ]).catch((error) => {
          console.error("Login telemetry could not be recorded:", error);
        });

        if (process.env.NODE_ENV !== "production") console.info("[auth] sign-in authorized");

        // 3. Return the user object (this gets encoded into the secure session token)
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          username,
          legalName: user.legalName ?? undefined,
        };
      }
    })
  ],
  session: {
    strategy: "jwt", // Use JSON Web Tokens for session management
  },
  callbacks: {
    async jwt({ token, user }) {
      // Add role and id to the token when the user logs in
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.username = user.username;
        token.legalName = user.legalName;
      }
      return token;
    },
    async session({ session, token }) {
      const currentUser = typeof token.id === "string"
        ? await prisma.user.findUnique({
          where: { id: token.id },
          select: { username: true, legalName: true, avatarData: true },
        })
        : null;

      // Add current account identity to the session so the dashboard does not wait for a second profile request.
      if (session.user) {
        session.user.role = token.role as Role;
        session.user.id = token.id as string;
        session.user.username = currentUser?.username ?? token.username;
        session.user.legalName = currentUser?.legalName ?? token.legalName;
        session.user.avatarData = currentUser?.avatarData ?? undefined;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login", // Redirect to our custom login page
  },
  secret: process.env.NEXTAUTH_SECRET,
};
