import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withScope } from "@/lib/db-context";
import { validateImageDataUrl } from "@/lib/image-upload";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function ticketDisplayName(user: { username: string | null }) {
  return user.username ? `@${user.username}` : "FEXEX user";
}

async function access(ticketId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const isAdmin = session.user.role === "ADMIN";
  const ticket = await withScope(session, (tx) => tx.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, subject: true, status: true, createdAt: true, updatedAt: true, user: { select: { email: true } } },
  }));
  if (!ticket || (ticket.userId !== session.user.id && !isAdmin)) {
    return { error: NextResponse.json({ error: "Support ticket not found" }, { status: 404 }) };
  }
  return { session, ticket };
}

export async function GET(_request: Request, context: RouteContext<"/api/support/tickets/[ticketId]/messages">) {
  const { ticketId } = await context.params;
  const permitted = await access(ticketId);
  if (permitted.error) return permitted.error;
  const limited = await enforceRateLimit(`ticket-messages-get:${permitted.session!.user.id}`, RATE_LIMITS.authedReadFast);
  if (limited) return limited;

  const messages = (await withScope(permitted.session!, (tx) => tx.supportMessage.findMany({
    where: { ticketId },
    include: { sender: { select: { username: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  }))).reverse();

  const visibleMessages = messages.map(({ sender, ...message }) => ({
    ...message,
    isOwn: message.senderId === permitted.session!.user.id,
    sender: { ...sender, displayName: sender.role === "ADMIN" ? "Admin" : ticketDisplayName(sender) },
  }));

  return NextResponse.json({ ticket: permitted.ticket, messages: visibleMessages });
}

export async function POST(request: Request, context: RouteContext<"/api/support/tickets/[ticketId]/messages">) {
  const { ticketId } = await context.params;
  const permitted = await access(ticketId);
  if (permitted.error) return permitted.error;
  const limited = await enforceRateLimit(`ticket-messages-post:${permitted.session!.user.id}`, RATE_LIMITS.chatWrite);
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const rawImageData = typeof payload?.imageData === "string" ? payload.imageData : "";
  const imageData = rawImageData ? validateImageDataUrl(rawImageData, 2_000_000) : null;
  if (rawImageData && !imageData) {
    return NextResponse.json({ error: "Attach a JPG, PNG, or WebP image under 2 MB." }, { status: 400 });
  }
  if ((!body && !imageData) || body.length > 1000) {
    return NextResponse.json({ error: "Add a message or an image. Messages can be up to 1000 characters." }, { status: 400 });
  }

  const saved = await withScope(permitted.session!, async (tx) => {
    const created = await tx.supportMessage.create({
      data: {
        ticketId,
        senderId: permitted.session!.user.id,
        body,
        ...(imageData ? { imageData } : {}),
      },
      include: { sender: { select: { username: true, role: true } } },
    });
    await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        // A customer reply reopens a ticket an admin had closed.
        ...(permitted.session!.user.role !== "ADMIN" && permitted.ticket!.status === "CLOSED" ? { status: "OPEN" } : {}),
      },
    });
    return created;
  });

  return NextResponse.json({
    ...saved,
    isOwn: true,
    sender: { ...saved.sender, displayName: saved.sender.role === "ADMIN" ? "Admin" : ticketDisplayName(saved.sender) },
  }, { status: 201 });
}
