"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AppHeader } from "@/components/app-header";
import { formatNaira } from "@/lib/currency";

interface CryptoOption {
  asset: string;
  name: string;
  icon: string;
  nairaPayoutPerUsd: number;
  available: boolean;
}

interface DefaultBankAccount {
  bankName: string;
  bankAccountNumber: string;
  legalName: string;
}

export default function CryptoTradePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams<{ asset: string }>();
  const assetParam = Array.isArray(params.asset) ? params.asset[0] : params.asset;
  const [crypto, setCrypto] = useState<CryptoOption | null>(null);
  const [defaultBankAccount, setDefaultBankAccount] = useState<DefaultBankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [usdValue, setUsdValue] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !assetParam) return;
    let active = true;
    void Promise.all([
      fetch("/api/crypto-rates").then(async (response) => {
        if (!response.ok) throw new Error("Could not load crypto rates");
        return response.json();
      }),
      fetch("/api/user/profile").then(async (response) => response.ok ? response.json() : null),
    ])
      .then(([rates, profile]) => {
        if (!active) return;
        const selected = (rates.cryptoAssets ?? []).find((item: CryptoOption) => item.asset.toLowerCase() === assetParam.toLowerCase());
        if (!selected) setLoadError("This crypto asset is not available on FEXEX.");
        else setCrypto(selected);
        if (profile?.bankName && profile?.bankAccountNumber && profile?.legalName) {
          setDefaultBankAccount({ bankName: profile.bankName, bankAccountNumber: profile.bankAccountNumber, legalName: profile.legalName });
        }
      })
      .catch(() => { if (active) setLoadError("We could not load this crypto trade. Please try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assetParam, status]);

  const numericUsdValue = Number(usdValue);
  const estimatedPayout = crypto?.available && Number.isFinite(numericUsdValue) && numericUsdValue > 0
    ? Math.round(numericUsdValue * crypto.nairaPayoutPerUsd)
    : null;

  const submitWithdrawal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!crypto?.available) {
      setMessage("This crypto asset is currently paused. Please choose another active asset.");
      return;
    }
    if (!defaultBankAccount) {
      setMessage("Save a default bank account in your wallet before requesting a withdrawal.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch("/api/crypto-withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset: crypto.asset, usdValue: Number(usdValue) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not submit your withdrawal request.");
        return;
      }
      setMessage(`Withdrawal ${data.orderId} submitted for Admin review. Expected payout: ${formatNaira(data.expectedPayout)}.`);
      setUsdValue("");
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] text-[#f4f3ee]">
      <AppHeader username={session?.user?.username} avatarData={session?.user?.avatarData} />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/trade?type=crypto" className="text-sm font-semibold text-[#d6c7ff] hover:text-[#e5dcff]">← All crypto assets</Link>
        {loading || status === "loading" ? <div className="mt-6 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-sm text-[#a9afa9]">Loading crypto trade...</div> : loadError || !crypto ? <section className="mt-6 rounded-3xl border border-red-400/20 bg-[#202323] p-8"><h1 className="text-2xl font-bold">Crypto asset unavailable</h1><p className="mt-2 text-sm text-red-200">{loadError || "This crypto asset was not found."}</p><Link href="/trade?type=crypto" className="mt-6 inline-flex rounded-xl bg-[#d6c7ff] px-4 py-3 font-bold text-[#161818]">Choose another asset</Link></section> : (
          <section className="mt-6 rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-2xl shadow-black/30 sm:p-8 lg:p-10">
            <div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f4f3ee]/10 bg-[#f4f3ee] p-2"><img src={crypto.icon} alt={`${crypto.asset} icon`} className="h-full w-full object-contain" /></span><div><p className="text-sm font-semibold text-[#d6c7ff]">CRYPTO TO NAIRA WITHDRAWAL</p><h1 className="mt-1 text-3xl font-semibold">Sell {crypto.asset}</h1></div></div>
            <p className="mt-5 text-sm leading-6 text-[#a9afa9]">Submit only your {crypto.asset} withdrawal details. Your Naira payout estimate updates instantly.</p>
            <form onSubmit={submitWithdrawal} className="mt-7 space-y-5">
              <div><label htmlFor="usd-value" className="mb-2 block text-sm font-medium text-[#d7dbd4]">{crypto.asset} value you are selling (USD)</label><input id="usd-value" type="number" inputMode="decimal" min="0.01" step="0.01" required value={usdValue} onChange={(event) => setUsdValue(event.target.value)} placeholder="e.g. 100" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none placeholder:text-[#777a75] focus:border-[#d6c7ff] focus:ring-2 focus:ring-[#d6c7ff]/20" /></div>
              <div className="rounded-2xl border border-[#d6c7ff]/25 bg-[#d6c7ff]/10 p-4"><p className="text-xs font-semibold tracking-wide text-[#e5dcff]">LIVE NAIRA WITHDRAWAL ESTIMATE</p>{crypto.available ? <><p className="mt-2 text-sm text-[#d7dbd4]">{crypto.asset} pays {formatNaira(crypto.nairaPayoutPerUsd)} for every $1 of submitted value.</p><p className="mt-2 text-2xl font-bold text-[#f4f3ee]">{estimatedPayout === null ? "Enter a crypto value" : formatNaira(estimatedPayout)}</p></> : <p className="mt-2 text-sm text-[#d7dbd4]">This asset is currently paused. You can return to choose another one.</p>}</div>
              <div className="rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/10 p-4"><p className="text-xs font-semibold tracking-wide text-[#d8ff96]">DEFAULT WITHDRAWAL ACCOUNT</p>{defaultBankAccount ? <><p className="mt-2 font-semibold text-[#f4f3ee]">{defaultBankAccount.bankName}</p><p className="text-sm text-[#d7dbd4]">{defaultBankAccount.legalName} · ••••••{defaultBankAccount.bankAccountNumber.slice(-4)}</p></> : <p className="mt-2 text-sm text-[#d7dbd4]">Save a default bank account in <Link href="/wallet#settings" className="font-semibold text-[#c6f65c] hover:text-[#d9ff86]">Wallet settings</Link> before withdrawing.</p>}</div>
              {message && <p role="status" className="rounded-xl bg-[#d6c7ff]/10 px-4 py-3 text-sm text-[#e5dcff]">{message}</p>}
              <button type="submit" disabled={submitting || !crypto.available || !defaultBankAccount} className="w-full rounded-xl bg-[#d6c7ff] px-4 py-3 font-bold text-[#161818] transition hover:bg-[#e5dcff] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Submitting withdrawal..." : `Request ${crypto.asset} withdrawal`}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
