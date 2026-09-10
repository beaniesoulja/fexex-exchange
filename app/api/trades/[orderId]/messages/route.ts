import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAdminOfTradeMessage } from "@/lib/notify";
import { validateImageDataUrl } from "@/lib/image-upload";

function tradeDisplayName(user: { username: string | null }) {
  return user.username ? `@${user.username}` : "FEXEX user";
}

async function access(orderId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, referenceId: true, userId: true, giftCardBrand: true, cryptoAsset: true, totalValue: true, status: true, resultDescription: true, resolvedAt: true } });
  if (!order || (order.userId !== session.user.id && session.user.role !== "ADMIN")) return { error: NextResponse.json({ error: "Trade not found" }, { status: 404 }) };
  return { session, order };
}

export async function GET(_request: Request, context: RouteContext<"/api/trades/[orderId]/messages">) {
  const { orderId } = await context.params;
  const permitted = await access(orderId);
  if (permitted.error) return permitted.error;
  // Keep the polling response bounded as a trade room grows. The client only
  // needs the most recent conversation when it refreshes.
  const messages = (await prisma.tradeMessage.findMany({
    where: { orderId },
    include: { sender: { select: { username: true, legalName: true, nameDisplay: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  })).reverse();
  const visibleMessages = messages.map(({ sender, ...message }) => ({
    ...message,
    isOwn: message.senderId === permitted.session!.user.id,
    sender: { ...sender, displayName: sender.role === "ADMIN" ? "Admin" : tradeDisplayName(sender) },
  }));
  return NextResponse.json({ order: permitted.order, messages: visibleMessages });
}

export async function POST(request: Request, context: RouteContext<"/api/trades/[orderId]/messages">) {
  const { orderId } = await context.params;
  const permitted = await access(orderId);
  if (permitted.error) return permitted.error;
  const payload = await request.json().catch(() => null);
  const body = payload && typeof payload === "object" ? (payload as { body?: unknown }).body : undefined;
  const imageData = payload && typeof payload === "object" ? (payload as { imageData?: unknown }).imageData : undefined;
  const message = typeof body === "string" ? body.trim() : "";
  const attachedImage = typeof imageData === "string" && imageData ? validateImageDataUrl(imageData, 2_000_000) : null;
  if (imageData && !attachedImage) {
    return NextResponse.json({ error: "Attach a JPG, PNG, or WebP image under 2 MB." }, { status: 400 });
  }
  if ((!message && !attachedImage) || message.length > 1000) return NextResponse.json({ error: "Add a message or an image. Messages can be up to 1000 characters." }, { status: 400 });
  if (permitted.order!.status === "COMPLETED") {
    return NextResponse.json({ error: "This successful trade is closed. No further action is needed." }, { status: 409 });
  }
  const saved = await prisma.tradeMessage.create({
    data: {
      orderId,
      senderId: permitted.session!.user.id,
      body: message,
      ...(attachedImage ? { imageData: attachedImage } : {}),
    },
    include: { sender: { select: { username: true, legalName: true, nameDisplay: true, role: true } } },
  });

  if (permitted.session!.user.role !== "ADMIN") {
    void notifyAdminOfTradeMessage({
      userEmail: permitted.session!.user.email ?? "Unknown customer",
      referenceId: permitted.order!.referenceId,
      orderId,
      message,
    }).catch((error) => console.error("Trade chat notification error:", error));
  }

  return NextResponse.json({ ...saved, isOwn: true, sender: { ...saved.sender, displayName: saved.sender.role === "ADMIN" ? "Admin" : tradeDisplayName(saved.sender) } }, { status: 201 });
}
