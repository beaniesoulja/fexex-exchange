// app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/currency";

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
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [wallet, setWallet] = useState<Wallet>({ fiatBalance: 0, cryptoBalance: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState("");
  const [walletAddressMessage, setWalletAddressMessage] = useState("");
  const [walletAddressSaving, setWalletAddressSaving] = useState(false);
  const [swapAmount, setSwapAmount] = useState("");
  const [swapRate, setSwapRate] = useState<number | null>(null);
  const [swapMinimum, setSwapMinimum] = useState(0.01);
  const [swapMessage, setSwapMessage] = useState("");
  const [swapSaving, setSwapSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
            setCryptoWalletAddress(profile.cryptoWalletAddress ?? "");
          }
          if (quote) {
            setSwapRate(quote.rate ?? null);
            setSwapMinimum(quote.minimumAmount ?? 0.01);
          }
        })
        .catch((error) => console.error("Failed to fetch profile", error))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#161818] text-xl text-[#a9afa9]">Loading your dashboard...</div>;
  }

  const saveWalletAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWalletAddressSaving(true);
    setWalletAddressMessage("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: cryptoWalletAddress }),
      });
      const data = await response.json();

      if (!response.ok) {
        setWalletAddressMessage(data.error ?? "We could not save your wallet address.");
        return;
      }

      setWalletAddressMessage("Wallet address saved.");
    } catch {
      setWalletAddressMessage("A network error occurred. Please try again.");
    } finally {
      setWalletAddressSaving(false);
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
      setSwaps((current) => [data.swap, ...current].slice(0, 5));
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-[#a9afa9]">Your value is ready to move, {session?.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push("/sell-giftcard")}
              className="rounded-lg bg-[#c6f65c] px-4 py-2 font-semibold text-[#161818] transition hover:bg-[#d9ff86]"
            >
              + Sell New Card
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="rounded-lg bg-[#2a2e2d] px-4 py-2 text-[#f4f3ee] transition hover:bg-[#343a38]"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl bg-[#c6f65c] p-6 text-[#161818] shadow-lg shadow-black/30">
            <p className="mb-1 text-sm font-medium text-[#3c4c1c]">Naira balance</p>
            <h2 className="text-4xl font-bold">{formatNaira(wallet.fiatBalance)}</h2>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-[#3c4c1c]">Payout Wallet Address (USDT TRC20)</p>
              <form onSubmit={saveWalletAddress} className="flex gap-2">
                <label className="sr-only" htmlFor="crypto-wallet-address">Payout wallet address</label>
                <input
                  id="crypto-wallet-address"
                  type="text"
                  value={cryptoWalletAddress}
                  onChange={(event) => setCryptoWalletAddress(event.target.value)}
                  placeholder="T..."
                  minLength={10}
                  required
                  className="min-w-0 flex-1 rounded-lg bg-[#f4f3ee] p-2 font-mono text-sm text-[#161818] outline-none placeholder:font-sans placeholder:text-[#777a75] focus:ring-2 focus:ring-[#161818]/30"
                />
                <button type="submit" disabled={walletAddressSaving} className="rounded-lg bg-[#161818] px-3 py-2 text-xs font-bold text-[#f4f3ee] transition hover:bg-[#2a2e2d] disabled:cursor-not-allowed disabled:opacity-60">
                  {walletAddressSaving ? "Saving..." : "Save"}
                </button>
              </form>
              {walletAddressMessage && <p role="status" className="text-xs font-medium text-[#3c4c1c]">{walletAddressMessage}</p>}
            </div>
            <button className="mt-4 rounded-lg bg-[#161818] px-4 py-2 text-sm font-semibold text-[#f4f3ee] transition hover:bg-[#2a2e2d]">
              Request Withdrawal
            </button>
          </div>
          
          <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-6 text-[#f4f3ee] shadow-lg shadow-black/30">
            <p className="mb-1 text-sm font-medium text-[#a9afa9]">Crypto holdings (USDT)</p>
            <h2 className="text-4xl font-bold">{wallet.cryptoBalance.toFixed(4)} <span className="text-lg text-[#a9afa9]">USDT</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#c8ccc7]">Crypto is held separately. Swap USDT to Naira first, then request a Naira payout.</p>
            {swapRate === null ? (
              <p role="status" className="mt-4 rounded-lg border border-[#d6c7ff]/30 bg-[#d6c7ff]/10 p-3 text-sm text-[#e5dcff]">The current swap rate is unavailable. Please try again later.</p>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-[#d6c7ff]">1 USDT = {formatNaira(swapRate)}</p>
                <form onSubmit={swapToNaira} className="flex gap-2">
                  <label className="sr-only" htmlFor="swap-amount">USDT amount to swap</label>
                  <input
                    id="swap-amount"
                    type="number"
                    inputMode="decimal"
                    min={swapMinimum}
                    step="0.000001"
                    max={wallet.cryptoBalance}
                    value={swapAmount}
                    onChange={(event) => setSwapAmount(event.target.value)}
                    placeholder={`Min. ${swapMinimum} USDT`}
                    required
                    className="min-w-0 flex-1 rounded-lg bg-[#f4f3ee] p-2 text-sm text-[#161818] outline-none placeholder:text-[#777a75] focus:ring-2 focus:ring-[#d6c7ff]"
                  />
                  <button type="submit" disabled={swapSaving || wallet.cryptoBalance < swapMinimum} className="rounded-lg bg-[#d6c7ff] px-3 py-2 text-xs font-bold text-[#161818] transition hover:bg-[#e5dcff] disabled:cursor-not-allowed disabled:opacity-50">
                    {swapSaving ? "Swapping..." : "Swap to Naira"}
                  </button>
                </form>
                {swapAmount && Number.isFinite(Number(swapAmount)) && Number(swapAmount) > 0 && (
                  <p className="text-xs text-[#a9afa9]">You will receive {formatNaira(Math.floor(Number(swapAmount) * swapRate))}.</p>
                )}
              </div>
            )}
            {swapMessage && <p role="status" className="mt-3 text-sm text-[#d6c7ff]">{swapMessage}</p>}
            {swaps[0] && <p className="mt-4 text-xs text-[#a9afa9]">Last swap: {swaps[0].cryptoAmount} {swaps[0].asset} → {formatNaira(swaps[0].nairaAmount)}.</p>}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-6 shadow-lg shadow-black/20">
          <h3 className="mb-4 text-xl font-bold text-[#f4f3ee]">Recent activity</h3>
          
          {orders.length === 0 ? (
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
    </main>
  );
}
