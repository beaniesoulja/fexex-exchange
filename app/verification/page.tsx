"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";

function VerificationRow({ title, description, active = false, action }: { title: string; description: string; active?: boolean; action: string }) {
  return <div className={`rounded-xl p-6 ${active ? "bg-[#c6f65c] text-[#161818]" : "bg-[#e6f1ed]"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm opacity-75">{description}</p></div><span className={`rounded-xl px-4 py-3 text-sm font-bold ${active ? "bg-white" : "bg-[#c6f65c]"}`}>{action}</span></div></div>;
}

export default function VerificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<{ legalName: string | null; dateOfBirth: string | null; kycVerified: boolean } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") void fetch("/api/user/profile").then((response) => response.ok ? response.json() : null).then(setProfile);
  }, [status, router]);

  const identityReady = Boolean(profile?.legalName && profile?.dateOfBirth);
  return <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link><ProfileMenu username={session?.user?.username} /></header><section className="mt-7 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8"><h1 className="text-2xl font-bold">Verification</h1><div className="mt-5 space-y-4"><VerificationRow title="Level 0 | Email verification" description="Activate your account by verifying your email" action="Verified ✓" /><VerificationRow title="Level 1 | Identity basics" description="Confirm your name and date of birth and start trading" active={identityReady} action={identityReady ? "Verified ✓" : "Complete profile"} /><VerificationRow title="Level 1+ | Basic verification (KYC)" description="Verify your ID to raise limits and trade with more confidence and trust" action={profile?.kycVerified ? "Verified ✓" : "Verify"} /></div><p className="mt-5 text-sm text-[#5e6863]">KYC enables higher limits. Every marketplace buyer will require Admin approval.</p></section></div></main>;
}
