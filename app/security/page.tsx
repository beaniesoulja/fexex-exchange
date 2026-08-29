"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ProfileMenu } from "@/components/profile-menu";

function ActionButton({ children, danger = false }: { children: string; danger?: boolean }) {
  return <button className={`rounded-xl px-4 py-2.5 font-bold ${danger ? "bg-rose-500 text-white" : "bg-white text-[#1d2220]"}`}>{children}</button>;
}

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link><ProfileMenu username={session?.user?.username} /></header><section className="mt-7 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8"><h1 className="text-2xl font-bold">Security</h1><p className="mt-1 text-sm text-[#5e6863]">Keep your account secure</p><div className="mt-5 space-y-4"><div className="flex items-center justify-between rounded-xl bg-[#eff1ed] p-6"><div><h2 className="text-xl font-bold">Change password</h2><p className="text-sm text-[#5e6863]">Set a new password for your account</p></div><Link href="/forgot-password"><ActionButton>Change</ActionButton></Link></div><div className="rounded-xl bg-[#eff1ed] p-6"><h2 className="text-xl font-bold">2FA settings</h2><p className="mt-1 text-sm text-[#5e6863]">Add an extra layer of account protection</p><div className="mt-4 flex items-center justify-between border-t border-[#d8ddd8] pt-4"><div><p className="font-bold">Authenticator app <span className="rounded bg-[#f4d46a] px-2 py-1 text-xs">Recommended</span></p><p className="text-sm text-[#5e6863]">Temporary codes from your authenticator app</p></div><ActionButton>Set up</ActionButton></div><div className="mt-4 flex items-center justify-between"><div><p className="font-bold">Email verification codes</p><p className="text-sm text-[#5e6863]">Receive temporary codes by email</p></div><ActionButton>Enable</ActionButton></div></div><div className="rounded-xl bg-[#eff1ed] p-6"><h2 className="text-xl font-bold">Close account</h2><p className="text-sm text-[#5e6863]">Closing your account is permanent and cannot be undone. Contact FEXEX support to request closure.</p><div className="mt-4 border-t border-[#d8ddd8] pt-4"><ActionButton danger>Close account</ActionButton></div></div></div></section></div></main>;
}
