// app/login/page.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";

import { Turnstile } from "@/components/turnstile";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedPasswordAttempts, setFailedPasswordAttempts] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileEnabled = process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (turnstileEnabled && !turnstileToken) {
      setError("Please complete the bot protection check.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      captchaToken: turnstileToken,
      redirect: false, 
    });

    if (result?.error) {
      setError(result.error === "Bot verification failed" ? "Bot protection could not verify your request. Please try again." : "Invalid email or password");
      if (result.error !== "Bot verification failed") {
        setFailedPasswordAttempts((attempts) => attempts + 1);
      }
      setLoading(false);
    } else {
      // Confirm the browser has received the session cookie before leaving this page.
      const session = await getSession();
      if (!session?.user) {
        setError("Your sign-in was accepted, but your session did not start. Please try again.");
        setLoading(false);
        return;
      }

      // A full navigation prevents protected pages from reading a stale client session.
      window.location.assign(session.user.role === "ADMIN" ? "/admin" : "/trade");
    }
  };

  return (
    <main className="fexex-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#161818] p-4 text-[#f4f3ee]">
      <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-one" />
      <div aria-hidden="true" className="fexex-hero-orb fexex-hero-orb-two" />
      <span aria-hidden="true" className="fexex-float-icon pointer-events-none absolute left-[8%] top-[18%] hidden text-4xl opacity-20 sm:block">🎮</span>
      <span aria-hidden="true" className="fexex-float-icon pointer-events-none absolute right-[10%] top-[24%] hidden text-4xl opacity-20 sm:block" style={{ animationDelay: "1.5s" }}>💳</span>
      <span aria-hidden="true" className="fexex-float-icon pointer-events-none absolute bottom-[16%] left-[12%] hidden text-4xl opacity-20 sm:block" style={{ animationDelay: "0.8s" }}>✦</span>
      <span aria-hidden="true" className="fexex-float-icon pointer-events-none absolute bottom-[20%] right-[8%] hidden text-4xl opacity-20 sm:block" style={{ animationDelay: "2.2s" }}>🔐</span>

      <div className="fexex-pop-in relative w-full max-w-md overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 shadow-2xl shadow-black/40">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#c6f65c]" />
        <div className="mb-6 flex justify-center"><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-9 w-auto" style={{ width: "auto" }} /></div>
        <h1 className="mb-2 text-center text-2xl font-bold">Welcome back <span aria-hidden="true">👋</span></h1>
        <p className="mb-6 text-center text-sm text-[#a9afa9]">Your next move, simplified.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#d7dbd4]">Email or username</label>
            <input 
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required 
              className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] p-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#d7dbd4]">Password</label>
            <div className="relative">
              <input
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] p-3 pr-16 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20"
              />
              <button type="button" onClick={() => setIsPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-[#c6f65c] hover:text-[#d9ff86]">{isPasswordVisible ? "Hide" : "Show"}</button>
            </div>
          </div>

          <Turnstile action="login" onTokenChange={setTurnstileToken} />

          {error && <p className="rounded-xl bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">{error}</p>}

          {failedPasswordAttempts >= 2 && <p className="text-center text-sm text-[#a9afa9]">Forgot your password? <Link href="/forgot-password" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Reset it by email</Link></p>}

          <button
            type="submit"
            disabled={loading || (turnstileEnabled && !turnstileToken)}
            className="w-full rounded-xl bg-[#c6f65c] py-3 font-bold text-[#161818] transition hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#a9afa9]">
          New to FEXEX? <Link href="/signup" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
