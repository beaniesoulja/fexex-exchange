import { NextResponse } from "next/server";
import { notifyAdminOfContactMessage } from "@/lib/notify";
import { getClientIp, rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = await rateLimit(`contact:${getClientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return tooManyRequestsResponse(retryAfterSeconds, "Too many messages sent from this connection. Please try again later.");
  }

  const payload = await request.json().catch(() => null);
  const name = typeof payload?.name === "string" ? payload.name.trim().slice(0, 120) : "";
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const subject = typeof payload?.subject === "string" ? payload.subject.trim().slice(0, 140) : "";
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";

  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Give your message a subject." }, { status: 400 });
  if (!message || message.length > 2000) return NextResponse.json({ error: "Enter a message up to 2000 characters." }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ADMIN_EMAIL;

  if (!apiKey || !from || !to) {
    console.error("Contact form email delivery is not configured.");
    return NextResponse.json({ error: "We could not send your message right now. Please try again later." }, { status: 503 });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[Contact Us] ${subject}`,
        html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Subject:</strong> ${subject}</p><p>${message.replace(/\n/g, "<br />")}</p>`,
      }),
    });
    if (!response.ok) throw new Error(`Resend request failed with status ${response.status}`);
  } catch (error) {
    console.error("Failed to send contact email:", error);
    return NextResponse.json({ error: "We could not send your message right now. Please try again later." }, { status: 502 });
  }

  void notifyAdminOfContactMessage({ name, email, subject, message }).catch((error) => console.error("Contact Telegram notification error:", error));

  return NextResponse.json({ message: "Your message has been sent. We'll get back to you soon." }, { status: 200 });
}
