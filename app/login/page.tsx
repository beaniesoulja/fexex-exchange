// app/login/page.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, 
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      // 1. Login successful! Now let's check their role to send them to the right place.
      const session = await getSession();
      
      // 2. Route Admins to /admin, and regular Users to /dashboard
      if (session?.user?.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard?welcome=1");
      }
    }
  };

  return (
    <main className="fexex-surface flex min-h-screen items-center justify-center bg-[#161818] p-4 text-[#f4f3ee]">
      <div className="w-full max-w-md rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 shadow-2xl shadow-black/40">
        {/* FIXED: Changed from "Admin Login" to a general welcome message */}
        <div className="mb-6 flex justify-center"><Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-9 w-auto" /></div>
        <h1 className="mb-2 text-center text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-[#a9afa9]">Your next move, simplified.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[#d7dbd4]">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] p-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[#d7dbd4]">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] p-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20"
            />
          </div>

          {error && <p className="rounded-xl bg-red-400/10 px-4 py-3 text-center text-sm text-red-200">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl bg-[#c6f65c] py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#a9afa9]">
          New to FEXEX? <Link href="/signup" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
