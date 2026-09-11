"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";

type AccountData = { legalName: string | null; dateOfBirth: string | null; emailVerified: string | null };
type KycStatusResponse = { kycVerified: boolean; submission: { status: "PENDING" | "APPROVED" | "REJECTED" } | null };

function VerificationRow({ title, description, active = false, action, onAction, href, loading = false }: {
  title: string; description: string; active?: boolean; action: string; onAction?: () => void; href?: string; loading?: boolean;
}) {
  const badge = <span className={`rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-white" : onAction || href ? "bg-[#c6f65c] hover:-translate-y-0.5 hover:shadow-md" : "bg-[#c6f65c]"}`}>{loading ? "Sending…" : action}</span>;
  return (
    <div className={`rounded-xl p-6 ${active ? "bg-[#c6f65c] text-[#161818]" : "bg-[#e6f1ed]"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm opacity-75">{description}</p></div>
        {href ? <Link href={href}>{badge}</Link> : onAction ? <button type="button" onClick={onAction} disabled={loading}>{badge}</button> : badge}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [kyc, setKyc] = useState<KycStatusResponse | null>(null);
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") {
      void fetch("/api/user/profile?scope=account").then((response) => response.ok ? response.json() : null).then(setAccount);
      void fetch("/api/kyc").then((response) => response.ok ? response.json() : null).then(setKyc);
    }
  }, [status, router]);

  const resendVerification = async () => {
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/email-verification/request", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setResendMessage(data.message ?? data.error ?? "We could not send the verification email.");
    } catch {
      setResendMessage("A network error occurred. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const identityReady = Boolean(account?.legalName && account?.dateOfBirth);
  const emailVerified = Boolean(account?.emailVerified);
  const kycAction = kyc?.kycVerified ? "Verified ✓" : kyc?.submission?.status === "PENDING" ? "Under review" : kyc?.submission?.status === "REJECTED" ? "Resubmit" : "Verify";

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={session?.user?.username} />
        </header>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-bold">Verification</h1>
          <div className="mt-5 space-y-4">
            <VerificationRow
              title="Level 0 | Email verification"
              description={emailVerified ? "Your email address is verified." : "Confirm your email address to activate your account."}
              active={emailVerified}
              action={emailVerified ? "Verified ✓" : "Resend email"}
              onAction={emailVerified ? undefined : resendVerification}
              loading={resending}
            />
            <VerificationRow title="Level 1 | Identity basics" description="Confirm your name and date of birth and start trading" active={identityReady} action={identityReady ? "Verified ✓" : "Complete profile"} href={identityReady ? undefined : "/profile"} />
            <VerificationRow title="Level 1+ | Basic verification (KYC)" description="Verify your ID to raise limits and trade with more confidence and trust" active={Boolean(kyc?.kycVerified)} action={kycAction} href={kyc?.kycVerified ? undefined : "/verification/kyc"} />
          </div>
          {resendMessage && <p role="status" className="mt-4 rounded-xl bg-[#eff1ed] px-4 py-3 text-sm font-medium text-[#4d6c16]">{resendMessage}</p>}
          <p className="mt-5 text-sm text-[#5e6863]">KYC enables higher limits. Every marketplace buyer will require Admin approval.</p>
        </section>
      </div>
    </main>
  );
}
