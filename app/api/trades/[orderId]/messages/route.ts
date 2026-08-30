import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function tradeDisplayName(user: { username: string | null; legalName: string | null; nameDisplay: string }) {
  if (user.nameDisplay === "FULL_NAME" && user.legalName) return user.legalName;
  if (user.nameDisplay === "INITIALS" && user.legalName) {
    const parts = user.legalName.trim().split(/\s+/);
    return `${parts[0]}${parts.length > 1 ? ` ${parts.at(-1)?.[0]}.` : ""}`;
  }
  return user.username ? `@${user.username}` : "FEXEX user";
}

async function access(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, userId: true, giftCardBrand: true, totalValue: true, status: true } });
  if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) return { error: NextResponse.json({ error: "Trade not found" }, { status: 404 }) };
  return { session, order };
}

export async function GET(_request: Request, context: RouteContext<"/api/trades/[orderId]/messages">) {
  const { orderId } = await context.params;
  const permitted = await access(orderId);
  if (permitted.error) return permitted.error;
  const messages = await prisma.tradeMessage.findMany({ where: { orderId }, include: { sender: { select: { username: true, legalName: true, nameDisplay: true, role: true } } }, orderBy: { createdAt: "asc" } });
  const visibleMessages = messages.map(({ sender, ...message }) => ({ ...message, sender: { ...sender, displayName: sender.role === "ADMIN" ? "Admin" : tradeDisplayName(sender) } }));
  return NextResponse.json({ order: permitted.order, messages: visibleMessages });
}

export async function POST(request: Request, context: RouteContext<"/api/trades/[orderId]/messages">) {
  const { orderId } = await context.params;
  const permitted = await access(orderId);
  if (permitted.error) return permitted.error;
  const { body } = await request.json();
  const message = typeof body === "string" ? body.trim() : "";
  if (!message || message.length > 1000) return NextResponse.json({ error: "Message must be 1–1000 characters." }, { status: 400 });
  const saved = await prisma.tradeMessage.create({ data: { orderId, senderId: permitted.session!.user.id, body: message }, include: { sender: { select: { username: true, legalName: true, nameDisplay: true, role: true } } } });
  return NextResponse.json({ ...saved, sender: { ...saved.sender, displayName: saved.sender.role === "ADMIN" ? "Admin" : tradeDisplayName(saved.sender) } }, { status: 201 });
}
