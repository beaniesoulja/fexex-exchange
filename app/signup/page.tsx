"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [legalName, setLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{ email: string; password: string } | null>(null);
  const phoneCodeWasChanged = useRef(false);

  useEffect(() => {
    const requestCountryCode = window.setTimeout(() => {
      void fetch("/api/geo/country-code", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data: { countryCode?: unknown } | null) => {
          if (!phoneCodeWasChanged.current && typeof data?.countryCode === "string" && /^\+\d{1,3}$/.test(data.countryCode)) {
            setPhoneCountryCode(data.countryCode);
          }
        })
        .catch(() => undefined);
    }, 0);

    return () => window.clearTimeout(requestCountryCode);
  }, []);

  useEffect(() => {
    let controller: AbortController | undefined;
    const usernameCheck = window.setTimeout(() => {
      if (!username) {
        setUsernameStatus("idle");
        setUsernameSuggestions([]);
        return;
      }

      if (!/^[a-z0-9_]{3,24}$/.test(username)) {
        setUsernameStatus("invalid");
        setUsernameSuggestions([]);
        return;
      }

      controller = new AbortController();
      setUsernameStatus("checking");
      setUsernameSuggestions([]);

      void fetch(`/api/username-availability?username=${encodeURIComponent(username)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Username check failed")))
        .then((data: { available?: unknown; suggestions?: unknown }) => {
          if (data.available === true) {
            setUsernameStatus("available");
            return;
          }

          setUsernameStatus("taken");
          setUsernameSuggestions(Array.isArray(data.suggestions) ? data.suggestions.filter((value): value is string => typeof value === "string").slice(0, 3) : []);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setUsernameStatus("error");
          }
        });

    }, 350);

    return () => {
      window.clearTimeout(usernameCheck);
      controller?.abort();
    };
  }, [username]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken. Choose a suggestion or try another one.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, legalName, dateOfBirth, phoneCountryCode, phoneNumber, email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "We could not create your account.");
        return;
      }

      setCreatedAccount({ email, password });
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] px-4 py-10 text-[#f4f3ee] sm:py-16">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-7 shadow-2xl shadow-black/40 sm:p-9">
        <Link href="/" aria-label="Fexex home">
          <Image src="/fexex-lockup-reverse.svg" alt="FEXEX" width={116} height={32} className="h-8 w-auto" />
        </Link>
        {createdAccount ? (
          <section className="mt-8" aria-labelledby="account-created-heading">
            <p className="inline-flex rounded-full bg-[#c6f65c]/10 px-3 py-1 text-xs font-bold tracking-wide text-[#d8ff96]">ACCOUNT CREATED</p>
            <h1 id="account-created-heading" className="mt-4 text-3xl font-semibold">You&apos;re all set.</h1>
            <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Your FEXEX account has been created. Keep these login details private.</p>
            <div className="mt-7 space-y-4 rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#a9afa9]">EMAIL ADDRESS</p>
                <p className="mt-1 break-all font-medium text-[#f4f3ee]">{createdAccount.email}</p>
              </div>
              <div className="border-t border-[#f4f3ee]/10 pt-4">
                <p className="text-xs font-semibold tracking-wide text-[#a9afa9]">PASSWORD</p>
                <p className="mt-1 break-all font-mono text-sm text-[#f4f3ee]">{createdAccount.password}</p>
              </div>
            </div>
            <button type="button" onClick={() => router.push("/login")} className="mt-6 w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86]">Go to login</button>
          </section>
        ) : <>
          <h1 className="mt-8 text-3xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm leading-6 text-[#a9afa9]">Value in motion starts with one account.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="username" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Username</label>
            <input id="username" type="text" value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))} autoComplete="username" minLength={3} maxLength={24} required aria-describedby="username-help" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="e.g. fexex_trader" />
            <div id="username-help" aria-live="polite" className="mt-2 text-xs leading-5">
              {usernameStatus === "checking" && <p className="text-[#a9afa9]">Checking username…</p>}
              {usernameStatus === "available" && <p className="text-[#d8ff96]">Username is available.</p>}
              {usernameStatus === "taken" && <div className="space-y-2"><p className="text-amber-200">That username is already taken. Try one of these:</p><div className="flex flex-wrap gap-2">{usernameSuggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setUsername(suggestion)} className="rounded-lg border border-[#c6f65c]/35 bg-[#c6f65c]/10 px-2.5 py-1 font-semibold text-[#d8ff96] transition hover:bg-[#c6f65c]/20">@{suggestion}</button>)}</div></div>}
              {usernameStatus === "invalid" && <p className="text-red-200">Use 3–24 letters, numbers, or underscores.</p>}
              {usernameStatus === "error" && <p className="text-amber-200">We could not check this username. It will be checked again when you create the account.</p>}
              {usernameStatus === "idle" && <p className="text-[#777a75]">3–24 letters, numbers, or underscores.</p>}
            </div>
          </div>
          <div>
            <label htmlFor="legal-name" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Full legal name</label>
            <input id="legal-name" type="text" value={legalName} onChange={(event) => setLegalName(event.target.value)} autoComplete="name" required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="As shown on your government ID" />
            <p className="mt-2 text-xs leading-5 text-[#777a75]">Use the name on your government ID. This helps with future KYC and Naira payouts.</p>
          </div>
          <div>
            <label htmlFor="date-of-birth" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Date of birth</label>
            <input id="date-of-birth" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} autoComplete="bday" required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Email address</label>
            <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="phone-number" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Phone number</label>
            <div className="flex gap-2">
              <input aria-label="Country calling code" type="tel" inputMode="numeric" value={phoneCountryCode} onChange={(event) => { phoneCodeWasChanged.current = true; const digits = event.target.value.replace(/\D/g, "").slice(0, 3); setPhoneCountryCode(digits ? `+${digits}` : ""); }} autoComplete="tel-country-code" required className="w-24 rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="+234" />
              <input id="phone-number" type="tel" inputMode="numeric" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} autoComplete="tel-national" pattern="[0-9]{10}" minLength={10} maxLength={10} required className="min-w-0 flex-1 rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="10-digit number" />
            </div>
            <p className="mt-2 text-xs leading-5 text-[#777a75]">Your country code is suggested from your location. You can change it; enter exactly 10 digits for your number.</p>
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Password</label>
            <div className="relative">
              <input id="password" type={isPasswordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 pr-16 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="At least 8 characters" />
              <button type="button" onClick={() => setIsPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-[#c6f65c] hover:text-[#d9ff86]">{isPasswordVisible ? "Hide" : "Show"}</button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-[#d7dbd4]">Confirm password</label>
            <div className="relative">
              <input id="confirm-password" type={isConfirmPasswordVisible ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 pr-16 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/20" placeholder="Repeat your password" />
              <button type="button" onClick={() => setIsConfirmPasswordVisible((visible) => !visible)} className="absolute inset-y-0 right-0 px-4 text-xs font-bold text-[#c6f65c] hover:text-[#d9ff86]">{isConfirmPasswordVisible ? "Hide" : "Show"}</button>
            </div>
          </div>

          {error && <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#c6f65c] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Creating account..." : "Create account"}
          </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#a9afa9]">
            Already a customer? <Link href="/login" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Log in</Link>
          </p>
        </>}
      </div>
    </main>
  );
}
