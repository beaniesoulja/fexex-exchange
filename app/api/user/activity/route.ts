import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withUserScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`user-activity-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  try {
    const activities = await withUserScope(session.user.id, (tx) => tx.userActivity.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, type: true, details: true, createdAt: true },
    }));
    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Failed to fetch user activity:", error);
    return NextResponse.json({ error: "Failed to fetch user activity." }, { status: 500 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`user-activity-post:${session.user.id}`, RATE_LIMITS.heartbeat);
  if (limited) return limited;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to update user activity:", error);
    return NextResponse.json({ error: "Failed to update user activity." }, { status: 500 });
  }
}
