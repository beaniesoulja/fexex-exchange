"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"checking" | "success" | "error">(token ? "checking" : "error");
  const [message, setMessage] = useState(token ? "" : "This verification link is invalid or has expired.");
  const requested = useRef(false);

  useEffect(() => {
    // Guarded by a ref, not the usual mount-flag cleanup: React Strict Mode's
    // dev-only mount→unmount→remount would otherwise let the first mount's
    // cleanup mark its own in-flight fetch as stale right as it resolves,
    // silently dropping the result — and the confirm token is single-use, so
    // a second real request would just fail anyway.
    if (!token || requested.current) return;
    requested.current = true;
    void fetch("/api/email-verification/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus("error");
          setMessage(data.error ?? "We could not verify your email.");
          return;
        }
        setStatus("success");
        setMessage(data.message ?? "Email verified successfully.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("We could not verify your email. Please try again.");
      });
  }, [token]);

  return (
    <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-[#f4f3ee]">
      <div className="w-full max-w-md rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-center shadow-2xl shadow-black/40">
        <Link href="/" aria-label="FEXEX home"><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="mx-auto h-9 w-auto" style={{ width: "auto" }} /></Link>

        {status === "checking" && (
          <>
            <h1 className="mt-8 text-2xl font-semibold">Verifying your email…</h1>
            <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Hang tight, this only takes a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="mt-8 text-2xl font-semibold">Email verified</h1>
            <p className="mt-2 text-sm leading-6 text-[#a9afa9]">{message}</p>
            <Link href="/login" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86]">Continue to login</Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="mt-8 text-2xl font-semibold">Verification failed</h1>
            <p className="mt-2 text-sm leading-6 text-red-200">{message}</p>
            <Link href="/verification" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86]">Request a new link</Link>
          </>
        )}
      </div>
    </main>
  );
}
