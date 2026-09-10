import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isFullAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isFullAdmin(session?.user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-team-get:${session!.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  const search = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  const team = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUB_ADMIN"] } },
    select: { id: true, email: true, username: true, role: true, canVerifyTrades: true, canManageRates: true },
    orderBy: { role: "asc" },
  });

  const searchResults = search
    ? await prisma.user.findMany({
      where: {
        role: "USER",
        OR: [{ email: { contains: search, mode: "insensitive" } }, { username: { contains: search, mode: "insensitive" } }],
      },
      select: { id: true, email: true, username: true, role: true, canVerifyTrades: true, canManageRates: true },
      take: 10,
    })
    : [];

  return NextResponse.json({ team, searchResults });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !isFullAdmin(session.user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-team-patch:${session.user.id}`, RATE_LIMITS.adminAction);
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const userId = typeof payload?.userId === "string" ? payload.userId : "";
  const makeSubAdmin = payload?.makeSubAdmin === true;
  const removeSubAdmin = payload?.removeSubAdmin === true;
  const canVerifyTradesValue = typeof payload?.canVerifyTrades === "boolean" ? payload.canVerifyTrades : undefined;
  const canManageRatesValue = typeof payload?.canManageRates === "boolean" ? payload.canManageRates : undefined;

  if (!userId) return NextResponse.json({ error: "Choose a user." }, { status: 400 });
  if (userId === session.user.id) return NextResponse.json({ error: "You cannot change your own access here." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "ADMIN") return NextResponse.json({ error: "Full admins cannot be modified here." }, { status: 400 });

  if (removeSubAdmin) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: "USER", canVerifyTrades: false, canManageRates: false },
    });
    return NextResponse.json(updated);
  }

  if (makeSubAdmin && target.role !== "SUB_ADMIN") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: "SUB_ADMIN", canVerifyTrades: false, canManageRates: false },
    });
    return NextResponse.json(updated);
  }

  if (target.role !== "SUB_ADMIN") return NextResponse.json({ error: "Make this user a sub-admin first." }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(canVerifyTradesValue !== undefined ? { canVerifyTrades: canVerifyTradesValue } : {}),
      ...(canManageRatesValue !== undefined ? { canManageRates: canManageRatesValue } : {}),
    },
  });
  return NextResponse.json(updated);
}
