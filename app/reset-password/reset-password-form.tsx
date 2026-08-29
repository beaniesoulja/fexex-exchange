"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) { setMessage("This reset link is invalid or has expired."); return; }
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      setMessage(data.message ?? data.error ?? "We could not reset your password.");
    } catch {
      setMessage("We could not reset your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-[#f4f3ee]">
      <div className="w-full max-w-md rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 shadow-2xl shadow-black/40">
        <Link href="/" aria-label="FEXEX home"><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-9 w-auto" /></Link>
        <h1 className="mt-8 text-3xl font-semibold">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Use at least eight characters and keep it unique to FEXEX.</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#d7dbd4]">New password</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Confirm new password</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
          </div>
          {message && <p role="status" className="rounded-xl bg-[#c6f65c]/10 px-4 py-3 text-sm text-[#d8ff96]">{message}</p>}
          <button type="submit" disabled={loading || !token} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:opacity-60">{loading ? "Updating..." : "Update password"}</button>
        </form>
      </div>
    </main>
  );
}
