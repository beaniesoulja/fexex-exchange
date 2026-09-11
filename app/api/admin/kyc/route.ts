import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { canVerifyTrades } from "@/lib/admin-access";
import { withAdminScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !canVerifyTrades(session.user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-kyc-get:${session.user.id}`, RATE_LIMITS.authedReadModerate);
  if (limited) return limited;

  const submissions = await withAdminScope((tx) => tx.kycSubmission.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true, username: true, legalName: true } } },
  }));

  return NextResponse.json(submissions);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !canVerifyTrades(session.user)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`admin-kyc-patch:${session.user.id}`, RATE_LIMITS.adminAction);
  if (limited) return limited;

  const payload = await request.json().catch(() => null);
  const submissionId = typeof payload?.submissionId === "string" ? payload.submissionId : "";
  const action = payload?.action === "APPROVE" ? "APPROVE" : payload?.action === "REJECT" ? "REJECT" : "";
  const reviewNote = typeof payload?.reviewNote === "string" ? payload.reviewNote.trim() : "";

  if (!submissionId || !action) {
    return NextResponse.json({ error: "Choose a submission and a valid action." }, { status: 400 });
  }
  if (action === "REJECT" && (!reviewNote || reviewNote.length > 500)) {
    return NextResponse.json({ error: "Add a short reason for the customer (up to 500 characters)." }, { status: 400 });
  }

  const result = await withAdminScope(async (tx) => {
    const submission = await tx.kycSubmission.findUnique({ where: { id: submissionId } });
    if (!submission || submission.status !== "PENDING") return null;

    const updated = await tx.kycSubmission.update({
      where: { id: submissionId },
      data: {
        status: action === "APPROVE" ? "APPROVED" : "REJECTED",
        reviewNote: action === "REJECT" ? reviewNote : null,
        reviewedAt: new Date(),
        reviewedById: session.user.id,
      },
    });

    if (action === "APPROVE") {
      await tx.user.update({ where: { id: submission.userId }, data: { kycVerified: true } });
    }

    return updated;
  });

  if (!result) return NextResponse.json({ error: "This submission has already been reviewed." }, { status: 409 });

  return NextResponse.json({
    message: action === "APPROVE" ? "Identity verification approved." : "Submission rejected with the supplied reason.",
  });
}
