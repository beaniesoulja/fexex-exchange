// app/dashboard/page.tsx
"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/currency";
import { NIGERIAN_BANKS } from "@/lib/nigerian-banks";
import { ProfileMenu } from "@/components/profile-menu";

interface Order {
  id: string;
  type: string;
  amount: number;
  totalValue: number;
  status: string;
  giftCardBrand: string | null;
  createdAt: string;
}

interface Wallet {
  fiatBalance: number;
  cryptoBalance: number;
}

interface Swap {
  id: string;
  asset: string;
  cryptoAmount: number;
  nairaAmount: number;
  rate: number;
  createdAt: string;
}

export default function UserDashboard() {
  return <DashboardContent />;
}

function DashboardLoading() {
  return (
    <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] md:p-8">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-3"><div className="h-9 w-52 rounded-lg bg-[#f4f3ee]/10" /><div className="h-4 w-72 rounded bg-[#f4f3ee]/5" /></div>
          <div className="h-10 w-28 rounded-lg bg-[#c6f65c]/25" />
        </div>
        <div className="grid gap-6 md:grid-cols-2"><div className="h-64 rounded-2xl bg-[#c6f65c]/20" /><div className="h-64 rounded-2xl bg-[#f4f3ee]/10" /></div>
        <div className="mt-8 h-64 rounded-2xl bg-[#f4f3ee]/10" />
      </div>
    </main>
  );
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showTradePrompt, setShowTradePrompt] = useState(false);
  
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [swaps, setSwaps] = useState<Swap[] | null>(null);
  const [username, setUsername] = useState("");
  const [legalName, setLegalName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankDetailsMessage, setBankDetailsMessage] = useState("");
  const [bankDetailsSaving, setBankDetailsSaving] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapRate, setSwapRate] = useState<number | null>(null);
  const [quoteLoaded, setQuoteLoaded] = useState(false);
  const [swapMinimum, setSwapMinimum] = useState(0.01);
  const [swapMessage, setSwapMessage] = useState("");
  const [swapSaving, setSwapSaving] = useState(false);

  useEffect(() => {
    const promptTimer = window.setTimeout(() => {
      setShowTradePrompt(new URLSearchParams(window.location.search).get("welcome") === "1");
    }, 0);
    return () => window.clearTimeout(promptTimer);
  }, []);

  // Protect route: Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
    } else {
      void Promise.all([
        fetch("/api/user/profile").then(async (res) => (res.ok ? res.json() : null)),
        fetch("/api/swaps").then(async (res) => (res.ok ? res.json() : null)),
      ])
        .then(([profile, quote]) => {
          if (profile) {
            setWallet(profile.wallet);
            setOrders(profile.orders);
            setSwaps(profile.swaps ?? []);
            setUsername(profile.username ?? "");
            setLegalName(profile.legalName ?? "");
            setBankName(profile.bankName ?? "");
            setBankAccountNumber(profile.bankAccountNumber ?? "");
          }
          if (quote) {
            setSwapRate(quote.rate ?? null);
            setSwapMinimum(quote.minimumAmount ?? 0.01);
          }
        })
        .catch((error) => console.error("Failed to fetch profile", error))
        .finally(() => setQuoteLoaded(true));
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const reportActivity = () => {
      void fetch("/api/user/activity", { method: "POST" }).catch((error) => {
        console.error("Failed to report user activity", error);
      });
    };

    reportActivity();
    const interval = window.setInterval(reportActivity, 60_000);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const refreshLiveData = () => {
      void Promise.all([
        fetch("/api/user/profile").then(async (res) => (res.ok ? res.json() : null)),
        fetch("/api/swaps").then(async (res) => (res.ok ? res.json() : null)),
      ])
        .then(([profile, quote]) => {
          if (profile) {
            setWallet(profile.wallet);
            setOrders(profile.orders);
            setSwaps(profile.swaps ?? []);
          }
          if (quote) {
            setSwapRate(quote.rate ?? null);
            setSwapMinimum(quote.minimumAmount ?? 0.01);
          }
        })
        .catch((error) => console.error("Failed to refresh dashboard data", error));
    };

    const interval = window.setInterval(refreshLiveData, 3_000);
    return () => window.clearInterval(interval);
  }, [status]);

  if (status !== "authenticated") {
    return <DashboardLoading />;
  }

  const saveBankDetails = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBankDetailsSaving(true);
    setBankDetailsMessage("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankAccountNumber }),
      });
      const data = await response.json();

      if (!response.ok) {
        setBankDetailsMessage(data.error ?? "We could not save your bank details.");
        return;
      }

      setBankDetailsMessage("Bank details saved.");
    } catch {
      setBankDetailsMessage("A network error occurred. Please try again.");
    } finally {
      setBankDetailsSaving(false);
    }
  };

  const swapToNaira = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSwapSaving(true);
    setSwapMessage("");

    try {
      const response = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: swapAmount }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSwapMessage(data.error ?? "We could not complete this swap.");
        return;
      }

      setWallet(data.wallet);
      setSwaps((current) => [data.swap, ...(current ?? [])].slice(0, 5));
      setSwapAmount("");
      setSwapMessage(`${data.swap.cryptoAmount} USDT converted to ${formatNaira(data.swap.nairaAmount)}.`);
    } catch {
      setSwapMessage("A network error occurred. Please try again.");
    } finally {
      setSwapSaving(false);
    }
  };

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="break-all text-[#a9afa9]">Your value is ready to move, {username ? `@${username}` : session?.user?.email}</p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <button 
              onClick={() => router.push("/sell-giftcard")}
              className="flex-1 rounded-lg bg-[#c6f65c] px-4 py-2 font-semibold text-[#161818] transition hover:bg-[#d9ff86] sm:flex-none"
            >
              + Sell New Card
            </button>
            <ProfileMenu username={username} email={session?.user?.email} />
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div id="settings" className="rounded-2xl bg-[#c6f65c] p-6 text-[#161818] shadow-lg shadow-black/30">
            <p className="mb-1 text-sm font-medium text-[#3c4c1c]">Naira balance</p>
            <h2 className="text-4xl font-bold">{wallet ? formatNaira(wallet.fiatBalance) : "—"}</h2>
            {!wallet && <p className="mt-1 text-xs font-medium text-[#3c4c1c]">Loading your balance...</p>}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-[#3c4c1c]">Bank details for Naira withdrawals</p>
              <form onSubmit={saveBankDetails} className="space-y-2">
                <div>
                  <label htmlFor="account-name" className="mb-1 block text-xs font-medium text-[#3c4c1c]">Account name</label>
                  <input
                    id="account-name"
                    type="text"
                    value={legalName}
                    readOnly
                    placeholder="Your legal registration name"
                    className="w-full cursor-not-allowed rounded-lg border border-[#161818]/10 bg-[#dce8b7] p-2 text-sm font-medium text-[#3c4c1c] outline-none placeholder:text-[#67734b]"
                  />
                </div>
                <label className="sr-only" htmlFor="bank-name">Bank name</label>
                <select
                  id="bank-name"
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  required
                  className="w-full rounded-lg bg-[#f4f3ee] p-2 text-sm text-[#161818] outline-none focus:ring-2 focus:ring-[#161818]/30"
                >
                  <option value="">Select your bank</option>
                  {NIGERIAN_BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </select>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="bank-account-number">Bank account number</label>
                <input
                  id="bank-account-number"
                  type="text"
                  inputMode="numeric"
                  value={bankAccountNumber}
                  onChange={(event) => setBankAccountNumber(event.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit account number"
                  minLength={10}
                  maxLength={10}
                  required
                  className="min-w-0 w-full flex-1 rounded-lg bg-[#f4f3ee] p-2 font-mono text-sm text-[#161818] outline-none placeholder:font-sans placeholder:text-[#777a75] focus:ring-2 focus:ring-[#161818]/30"
                />
                  <button type="submit" disabled={bankDetailsSaving} className="w-full rounded-lg bg-[#161818] px-3 py-2 text-xs font-bold text-[#f4f3ee] transition hover:bg-[#2a2e2d] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                    {bankDetailsSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
              {bankDetailsMessage && <p role="status" className="text-xs font-medium text-[#3c4c1c]">{bankDetailsMessage}</p>}
            </div>
            <button className="mt-4 rounded-lg bg-[#161818] px-4 py-2 text-sm font-semibold text-[#f4f3ee] transition hover:bg-[#2a2e2d]">
              Request Withdrawal
            </button>
          </div>
          
          <div id="crypto-balance" className="scroll-mt-4 rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-6 text-[#f4f3ee] shadow-lg shadow-black/30">
            <p className="mb-1 text-sm font-medium text-[#a9afa9]">Crypto holdings (USDT)</p>
            <h2 className="text-4xl font-bold">{wallet ? wallet.cryptoBalance.toFixed(4) : "—"} <span className="text-lg text-[#a9afa9]">USDT</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#c8ccc7]">Crypto is held separately. Swap USDT to Naira first, then request a Naira payout.</p>
            {!quoteLoaded ? (
              <p role="status" className="mt-4 rounded-lg border border-[#f4f3ee]/10 bg-[#f4f3ee]/5 p-3 text-sm text-[#a9afa9]">Loading today&apos;s swap rate...</p>
            ) : swapRate === null ? (
              <p role="status" className="mt-4 rounded-lg border border-[#d6c7ff]/30 bg-[#d6c7ff]/10 p-3 text-sm text-[#e5dcff]">The current swap rate is unavailable. Please try again later.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-[#d6c7ff]">1 USDT = {formatNaira(swapRate)}</p>
                <form onSubmit={swapToNaira} className="flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="swap-amount">USDT amount to swap</label>
                  <input
                    id="swap-amount"
                    type="number"
                    inputMode="decimal"
                    min={swapMinimum}
                    step="0.000001"
                    max={wallet?.cryptoBalance ?? 0}
                    value={swapAmount}
                    onChange={(event) => setSwapAmount(event.target.value)}
                    placeholder={`Min. ${swapMinimum} USDT`}
                    required
                    className="min-w-0 w-full flex-1 rounded-lg bg-[#f4f3ee] p-2 text-sm text-[#161818] outline-none placeholder:text-[#777a75] focus:ring-2 focus:ring-[#d6c7ff]"
                  />
                  <button type="submit" disabled={swapSaving || !wallet || wallet.cryptoBalance < swapMinimum} className="w-full rounded-lg bg-[#d6c7ff] px-3 py-2 text-xs font-bold text-[#161818] transition hover:bg-[#e5dcff] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                    {swapSaving ? "Swapping..." : "Swap to Naira"}
                  </button>
                </form>
                {swapAmount && Number.isFinite(Number(swapAmount)) && Number(swapAmount) > 0 && (
                  <p className="text-xs text-[#a9afa9]">You will receive {formatNaira(Math.floor(Number(swapAmount) * swapRate))}.</p>
                )}
              </div>
            )}
            {swapMessage && <p role="status" className="mt-3 text-sm text-[#d6c7ff]">{swapMessage}</p>}
            {swaps?.[0] && <p className="mt-4 text-xs text-[#a9afa9]">Last swap: {swaps[0].cryptoAmount} {swaps[0].asset} → {formatNaira(swaps[0].nairaAmount)}.</p>}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-lg shadow-black/20">
          <h3 className="mb-4 text-xl font-bold text-[#f4f3ee]">Recent activity</h3>
          
          {orders === null ? (
            <p role="status" className="py-8 text-center text-[#a9afa9]">Loading recent activity...</p>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-[#a9afa9]">No transactions yet. Start by selling a gift card.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#f4f3ee]/10 text-sm text-[#a9afa9]">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Payout</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-[#f4f3ee]/10 last:border-0">
                      <td className="py-4 text-[#c8ccc7]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-medium text-[#f4f3ee]">
                        Sell {order.giftCardBrand || order.type.replace('_', ' ')}
                      </td>
                      <td className="py-4 text-[#c8ccc7]">{formatNaira(order.amount)}</td>
                      <td className="py-4 font-semibold text-[#c6f65c]">{formatNaira(order.totalValue)}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 
                            'bg-red-100 text-red-700'}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showTradePrompt && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="trade-choice-heading">
          <div className="w-full max-w-lg rounded-3xl border border-[#f4f3ee]/15 bg-[#202323] p-6 shadow-2xl shadow-black/60 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#c6f65c]">WELCOME TO FEXEX</p>
            <h2 id="trade-choice-heading" className="mt-3 text-3xl font-semibold text-[#f4f3ee]">What would you like to do?</h2>
            <p className="mt-3 text-sm leading-6 text-[#a9afa9]">Choose a service to begin. You can always come back to your dashboard.</p>

            <div className="mt-7 grid gap-3">
              <Link href="/sell-giftcard" className="rounded-2xl border border-[#c6f65c]/40 bg-[#c6f65c]/10 p-5 transition hover:border-[#c6f65c] hover:bg-[#c6f65c]/20">
                <span className="block text-lg font-bold text-[#f4f3ee]">Sell a gift card</span>
                <span className="mt-1 block text-sm leading-6 text-[#c8ccc7]">Enter your USD card value and receive a Naira payout estimate.</span>
              </Link>
              <Link href="/dashboard#crypto-balance" className="rounded-2xl border border-[#d6c7ff]/40 bg-[#d6c7ff]/10 p-5 transition hover:border-[#d6c7ff] hover:bg-[#d6c7ff]/20">
                <span className="block text-lg font-bold text-[#f4f3ee]">Exchange crypto to cash</span>
                <span className="mt-1 block text-sm leading-6 text-[#c8ccc7]">Convert your available USDT to Naira at today&apos;s rate.</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowTradePrompt(false);
                router.replace("/dashboard");
              }}
              className="mt-6 text-sm font-semibold text-[#a9afa9] transition hover:text-[#f4f3ee]"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
