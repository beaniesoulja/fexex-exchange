"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Turnstile } from "@/components/turnstile";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (turnstileEnabled && !turnstileToken) {
      setMessage("Please complete the bot protection check.");
      return;
    }
    setLoading(true);
    setMessage("");
    setResetUrl("");
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken: turnstileToken }),
      });
      const data = await response.json();
      setMessage(data.message ?? "If an account matches that email, you will receive reset instructions shortly.");
      setResetUrl(typeof data.resetUrl === "string" ? data.resetUrl : "");
    } catch {
      setMessage("If an account matches that email, you will receive reset instructions shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-[#f4f3ee]">
      <div className="w-full max-w-md rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 shadow-2xl shadow-black/40">
        <Link href="/" aria-label="FEXEX home"><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-9 w-auto" /></Link>
        <h1 className="mt-8 text-3xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Enter your account email and we&apos;ll send a reset link.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Email address</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
          </div>
          <Turnstile action="password_reset" onTokenChange={setTurnstileToken} />
          {message && <p role="status" className="rounded-xl bg-[#c6f65c]/10 px-4 py-3 text-sm text-[#d8ff96]">{message}</p>}
          {resetUrl && <Link href={resetUrl} className="block rounded-xl border border-[#c6f65c]/40 px-4 py-3 text-center text-sm font-bold text-[#c6f65c] hover:bg-[#c6f65c]/10">Continue to password reset</Link>}
          <button type="submit" disabled={loading || (turnstileEnabled && !turnstileToken)} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:opacity-60">{loading ? "Sending..." : "Email reset link"}</button>
        </form>
        <p className="mt-7 text-center text-sm text-[#a9afa9]">Remembered it? <Link href="/login" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Log in</Link></p>
      </div>
    </main>
  );
}
