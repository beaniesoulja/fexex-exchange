import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ONLINE_WINDOW_MINUTES = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
    const [
      totalUsers,
      onlineUsers,
      totalTrades,
      pendingTrades,
      successfulTrades,
      declinedTrades,
      users,
      recentActivities,
      userTradeTotals,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: onlineSince } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.order.count({ where: { status: "REJECTED" } }),
      prisma.user.findMany({
        select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true, lastActiveAt: true },
        orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.userActivity.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      }),
      prisma.order.groupBy({
        by: ["userId"],
        _count: { _all: true },
        _sum: { totalValue: true },
      }),
    ]);

    const totalsByUserId = new Map(userTradeTotals.map((total) => [total.userId, total]));
    const usersWithStats = users.map((user) => {
      const totals = totalsByUserId.get(user.id);
      return {
        ...user,
        isOnline: user.lastActiveAt !== null && user.lastActiveAt >= onlineSince,
        tradeCount: totals?._count._all ?? 0,
        tradeVolume: totals?._sum.totalValue ?? 0,
      };
    });
    const topUsers = [...usersWithStats]
      .filter((user) => user.tradeCount > 0)
      .sort((a, b) => b.tradeVolume - a.tradeVolume || b.tradeCount - a.tradeCount)
      .slice(0, 10);

    return NextResponse.json({
      generatedAt: new Date(),
      onlineWindowMinutes: ONLINE_WINDOW_MINUTES,
      stats: { totalUsers, onlineUsers, totalTrades, pendingTrades, successfulTrades, declinedTrades },
      users: usersWithStats,
      topUsers,
      recentActivities,
    });
  } catch (error) {
    console.error("Failed to load admin analytics:", error);
    return NextResponse.json({ error: "Failed to load admin analytics." }, { status: 500 });
  }
}
