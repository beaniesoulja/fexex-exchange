"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";

function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function EnvelopeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 6.5l8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function SecurityRow({ icon, iconBg, iconColor, title, description, action, danger = false, disabled = false, href }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; title: string; description: string; action: string; danger?: boolean; disabled?: boolean; href?: string;
}) {
  const button = (
    <button type="button" disabled={disabled} className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-500 hover:bg-rose-600" : "bg-[#00b878]"}`}>
      {action}
    </button>
  );
  return (
    <div className="flex items-center gap-4 border-b border-[#eff1ed] py-5 last:border-0">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-[#5e6863]">{description}</p>
      </div>
      {href && !disabled ? <Link href={href}>{button}</Link> : button}
    </div>
  );
}

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<{ email: string | null; phoneCountryCode: string | null; phoneNumber: string | null } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/user/profile?scope=account")
      .then((response) => response.ok ? response.json() : null)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [status]);

  const hasPhone = Boolean(profile?.phoneNumber);

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={session?.user?.username} />
        </header>

        <section className="fexex-pop-in mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-bold">Security</h1>
          <p className="mt-1 text-sm text-[#5e6863]">Keep your account secure</p>

          <div className="mt-5">
            <SecurityRow icon={<LockIcon />} iconBg="bg-[#e6f7ef]" iconColor="text-[#00b878]" title="Login password" description="Used to sign in to your FEXEX account" action="Edit" href="/forgot-password" />
            <SecurityRow icon={<EnvelopeIcon />} iconBg="bg-[#fdeee3]" iconColor="text-[#e0692a]" title="Email" description={profile?.email ?? "Loading…"} action="Edit" href="/profile" />
            <SecurityRow icon={<PhoneIcon />} iconBg="bg-[#e4f0fb]" iconColor="text-[#2f7fe0]" title="Phone number" description={hasPhone ? `${profile?.phoneCountryCode} ${profile?.phoneNumber}` : "Not added yet"} action={hasPhone ? "Edit" : "Bind"} href="/profile" />
            <SecurityRow icon={<ShieldIcon />} iconBg="bg-[#e6f7ef]" iconColor="text-[#00b878]" title="Two-factor authentication" description="Add an extra layer of protection · Coming soon" action="Set up" disabled />
          </div>

          <div className="mt-7 rounded-xl bg-[#eff1ed] p-6">
            <h2 className="text-lg font-bold">Close account</h2>
            <p className="mt-1 text-sm text-[#5e6863]">Closing your account is permanent and cannot be undone. Contact FEXEX support to request closure.</p>
            <Link href="/help-center" className="mt-4 inline-flex rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-md">Close account</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
