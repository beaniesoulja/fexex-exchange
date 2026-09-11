import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withAdminScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-support-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  const tickets = await withAdminScope((tx) => tx.supportTicket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      user: { select: { email: true, username: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  }));

  return NextResponse.json(tickets.map(({ messages, ...ticket }) => ({
    ...ticket,
    lastMessage: messages[0] ?? null,
  })));
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-support-patch:${session.user.id}`, RATE_LIMITS.adminAction);
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const ticketId = typeof payload?.ticketId === "string" ? payload.ticketId : "";
  const nextStatus = payload?.status === "CLOSED" ? "CLOSED" : payload?.status === "OPEN" ? "OPEN" : "";
  if (!ticketId || !nextStatus) return NextResponse.json({ error: "Choose a ticket and a valid status." }, { status: 400 });

  const ticket = await withAdminScope((tx) => tx.supportTicket.update({
    where: { id: ticketId },
    data: { status: nextStatus },
  })).catch(() => null);
  if (!ticket) return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });

  return NextResponse.json(ticket);
}
