import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { withUserScope } from "@/lib/db-context";
import { validateImageDataUrl } from "@/lib/image-upload";
import { notifyAdminOfKycSubmission } from "@/lib/notify";
import { DAILY_QUOTAS, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const DOCUMENT_TYPES = ["National ID", "International Passport", "Driver's License", "Voter's Card"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`kyc-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  const result = await withUserScope(session.user.id, async (tx) => {
    const user = await tx.user.findUnique({ where: { id: session.user.id }, select: { kycVerified: true } });
    const latest = await tx.kycSubmission.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, documentType: true, reviewNote: true, createdAt: true, reviewedAt: true },
    });
    return { kycVerified: user?.kycVerified ?? false, submission: latest };
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimited = await enforceRateLimit(`kyc-submit:${session.user.id}`, RATE_LIMITS.ticketCreate);
  if (rateLimited) return rateLimited;
  const quotaLimited = await enforceRateLimit(`kyc-quota:${session.user.id}`, DAILY_QUOTAS.kyc, "You've reached today's verification submission limit. Please try again tomorrow.");
  if (quotaLimited) return quotaLimited;

  const payload = await request.json().catch(() => null);
  const documentType = typeof payload?.documentType === "string" ? payload.documentType : "";
  const rawDocumentImage = typeof payload?.documentImage === "string" ? payload.documentImage : "";
  const rawSelfieImage = typeof payload?.selfieImage === "string" ? payload.selfieImage : "";

  if (!DOCUMENT_TYPES.includes(documentType)) {
    return NextResponse.json({ error: "Choose a valid document type." }, { status: 400 });
  }

  const documentImage = validateImageDataUrl(rawDocumentImage, 3_000_000);
  const selfieImage = validateImageDataUrl(rawSelfieImage, 3_000_000);
  if (!documentImage) return NextResponse.json({ error: "Upload a clear JPG, PNG, or WebP photo of your document (under 3MB)." }, { status: 400 });
  if (!selfieImage) return NextResponse.json({ error: "Upload a JPG, PNG, or WebP selfie holding your document (under 3MB)." }, { status: 400 });

  const result = await withUserScope(session.user.id, async (tx) => {
    const existing = await tx.user.findUnique({ where: { id: session.user.id }, select: { kycVerified: true } });
    if (existing?.kycVerified) return { error: "Your identity is already verified." as const };

    const pending = await tx.kycSubmission.findFirst({ where: { userId: session.user.id, status: "PENDING" } });
    if (pending) return { error: "You already have a submission under review." as const };

    const submission = await tx.kycSubmission.create({
      data: { userId: session.user.id, documentType, documentImage, selfieImage },
      select: { id: true, status: true, documentType: true, createdAt: true },
    });
    return { submission };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });

  void notifyAdminOfKycSubmission({
    userEmail: session.user.email ?? "Unknown customer",
    documentType,
    submissionId: result.submission.id,
  }).catch((error) => console.error("KYC notification error:", error));

  return NextResponse.json({ message: "Your verification documents were submitted for review.", submission: result.submission }, { status: 201 });
}
