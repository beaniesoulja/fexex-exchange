import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateImageDataUrl } from "@/lib/image-upload";
import { DAILY_QUOTAS, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`tickets-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return NextResponse.json(tickets.map(({ messages, ...ticket }) => ({
    ...ticket,
    lastMessage: messages[0] ?? null,
  })));
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimited = await enforceRateLimit(`tickets-create:${session.user.id}`, RATE_LIMITS.ticketCreate);
  if (rateLimited) return rateLimited;
  const quotaLimited = await enforceRateLimit(`tickets-quota:${session.user.id}`, DAILY_QUOTAS.tickets, "You've reached today's support ticket limit. Please try again tomorrow.");
  if (quotaLimited) return quotaLimited;

  const payload = await request.json().catch(() => null);
  const subject = typeof payload?.subject === "string" ? payload.subject.trim().slice(0, 140) : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const rawImageData = typeof payload?.imageData === "string" ? payload.imageData : "";
  const imageData = rawImageData ? validateImageDataUrl(rawImageData, 2_000_000) : null;

  if (!subject) return NextResponse.json({ error: "Give your ticket a short subject." }, { status: 400 });
  if (rawImageData && !imageData) {
    return NextResponse.json({ error: "Attach a JPG, PNG, or WebP image under 2 MB." }, { status: 400 });
  }
  if (!body && !imageData) return NextResponse.json({ error: "Describe your issue or attach an image." }, { status: 400 });
  if (body.length > 1000) return NextResponse.json({ error: "Messages can be up to 1000 characters." }, { status: 400 });

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      subject,
      messages: {
        create: {
          senderId: session.user.id,
          body,
          ...(imageData ? { imageData } : {}),
        },
      },
    },
    include: { messages: true },
  });

  return NextResponse.json(ticket, { status: 201 });
}
