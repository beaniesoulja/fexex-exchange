import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { withAdminScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ONLINE_WINDOW_MINUTES = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(`admin-analytics:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  try {
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [
      totalUsers,
      onlineUsers,
      totalTrades,
      pendingTrades,
      successfulTrades,
      declinedTrades,
      users,
      recentActivities,
      recentProfileAudits,
      userTradeTotals,
      todayTrades,
      pendingGiftCardTrades,
      pendingCryptoTrades,
    ] = await withAdminScope((tx) => Promise.all([
      tx.user.count(),
      tx.user.count({ where: { lastActiveAt: { gte: onlineSince } } }),
      tx.order.count(),
      tx.order.count({ where: { status: "PENDING" } }),
      tx.order.count({ where: { status: "COMPLETED" } }),
      tx.order.count({ where: { status: "REJECTED" } }),
      tx.user.findMany({
        select: { id: true, email: true, role: true, createdAt: true, lastLoginAt: true, lastActiveAt: true },
        orderBy: [{ lastActiveAt: "desc" }, { createdAt: "desc" }],
        take: 100,
      }),
      tx.userActivity.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      }),
      tx.profileAudit.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      }),
      tx.order.groupBy({
        by: ["userId"],
        _count: { _all: true },
        _sum: { totalValue: true },
        orderBy: { _sum: { totalValue: "desc" } },
        take: 100,
      }),
      tx.order.aggregate({
        where: { createdAt: { gte: startOfToday } },
        _count: { _all: true },
        _sum: { totalValue: true },
      }),
      tx.order.count({ where: { status: "PENDING", type: "SELL_GIFTCARD" } }),
      tx.order.count({ where: { status: "PENDING", type: "SELL_CRYPTO" } }),
    ]));

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
    const activityFeed = [
      ...recentActivities.map((activity) => ({ ...activity, type: activity.type })),
      ...recentProfileAudits.map((audit) => ({ ...audit, type: audit.type })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 100);

    return NextResponse.json({
      generatedAt: new Date(),
      onlineWindowMinutes: ONLINE_WINDOW_MINUTES,
      stats: {
        totalUsers,
        onlineUsers,
        totalTrades,
        pendingTrades,
        successfulTrades,
        declinedTrades,
        todayTrades: todayTrades._count._all,
        todayVolume: todayTrades._sum.totalValue ?? 0,
        pendingGiftCardTrades,
        pendingCryptoTrades,
      },
      users: usersWithStats,
      topUsers,
      recentActivities: activityFeed,
    });
  } catch (error) {
    console.error("Failed to load admin analytics:", error);
    return NextResponse.json({ error: "Failed to load admin analytics." }, { status: 500 });
  }
}
