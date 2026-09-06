import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const payload = await request.json().catch(() => null);
  const subject = typeof payload?.subject === "string" ? payload.subject.trim().slice(0, 140) : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const imageData = typeof payload?.imageData === "string" ? payload.imageData : "";

  if (!subject) return NextResponse.json({ error: "Give your ticket a short subject." }, { status: 400 });
  if (!body && !imageData) return NextResponse.json({ error: "Describe your issue or attach an image." }, { status: 400 });
  if (body.length > 1000) return NextResponse.json({ error: "Messages can be up to 1000 characters." }, { status: 400 });
  if (imageData && (!/^data:image\/(jpeg|png|webp);base64,/.test(imageData) || imageData.length > 3_000_000)) {
    return NextResponse.json({ error: "Attach a JPG, PNG, or WebP image under 2 MB." }, { status: 400 });
  }

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
