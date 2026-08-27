// app/admin/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/currency";

// 1. FIXED: Added giftCardImage to the interface
interface Order {
  id: string;
  type: string;
  amount: number;
  rate: number;
  totalValue: number;
  giftCardBrand: string | null;
  giftCardCountry: string | null;
  giftCardCode: string | null;
  giftCardImage: string | null; // <-- Added this
  createdAt: string;
  user: { email: string };
}

interface GiftCardRate {
  id: string;
  brand: string;
  payoutPercent: number;
  isActive: boolean;
}

interface Pricing {
  usdToNairaRate: number;
  giftCardRates: GiftCardRate[];
  updatedAt: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
      router.push("/login");
    } else {
      void fetch("/api/admin/orders")
        .then((res) => res.json())
        .then(setOrders)
        .catch((error) => console.error("Failed to fetch orders", error))
        .finally(() => setLoading(false));
      void fetch("/api/admin/pricing")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load pricing");
          return res.json();
        })
        .then(setPricing)
        .catch((error) => {
          console.error("Failed to fetch pricing", error);
          setPricingMessage("We could not load the current pricing.");
        });
    }
  }, [status, session, router]);

  const handleAction = async (orderId: string, action: "APPROVE" | "REJECT") => {
    setActionLoading(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        alert(`✅ ${action === "APPROVE" ? "USDT payout initiated" : "Order rejected"}!`);
      } else {
        const data = await res.json().catch(() => null);
        alert(`❌ ${data?.error ?? "Failed to process order."}`);
      }
    } catch {
      alert("❌ Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  const updateGiftCardRate = (brand: string, payoutPercent: number) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) =>
        rate.brand === brand ? { ...rate, payoutPercent } : rate,
      ),
    } : current);
  };

  const toggleGiftCardBuying = (brand: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) =>
        rate.brand === brand ? { ...rate, isActive } : rate,
      ),
    } : current);
  };

  const savePricing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pricing) return;

    setPricingSaving(true);
    setPricingMessage("");
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usdToNairaRate: pricing.usdToNairaRate,
          giftCardRates: pricing.giftCardRates.map(({ brand, payoutPercent, isActive }) => ({ brand, payoutPercent, isActive })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPricingMessage(data.error ?? "We could not save the pricing.");
        return;
      }

      setPricing((current) => current ? {
        ...current,
        usdToNairaRate: data.usdToNairaRate,
        giftCardRates: data.giftCardRates,
      } : current);
      setPricingMessage("Pricing saved. New trades will use these rates.");
    } catch {
      setPricingMessage("A network error occurred. Please try again.");
    } finally {
      setPricingSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#161818] p-8 text-center text-xl text-[#a9afa9]">Loading secure dashboard...</div>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="break-all text-sm text-[#a9afa9]">Logged in as: {session?.user?.email}</p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <button onClick={fetchOrders} className="font-semibold text-[#c6f65c] transition hover:text-[#d9ff86]">
              🔄 Refresh
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="flex-1 rounded-lg bg-[#2a2e2d] px-4 py-2 text-[#f4f3ee] transition hover:bg-[#343a38] sm:flex-none"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-[#d6c7ff]/25 bg-[#202323] p-5 shadow-lg shadow-black/20 sm:p-6" aria-labelledby="pricing-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#d6c7ff]">DAILY PRICING</p>
              <h2 id="pricing-heading" className="mt-1 text-2xl font-bold text-[#f4f3ee]">Trade rates</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a9afa9]">Set the USD / USDT to Naira rate and the payout percentage for every gift card. Changes apply only to new trades.</p>
            </div>
          </div>

          {pricing ? (
            <form onSubmit={savePricing} className="mt-6 space-y-6">
              <div className="max-w-sm">
                <label htmlFor="usd-to-naira-rate" className="mb-2 block text-sm font-semibold text-[#f4f3ee]">1 USD / USDT = Naira</label>
                <input
                  id="usd-to-naira-rate"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  required
                  value={pricing.usdToNairaRate}
                  onChange={(event) => setPricing((current) => current ? { ...current, usdToNairaRate: Number(event.target.value) } : current)}
                  className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-3 text-[#f4f3ee] outline-none focus:border-[#d6c7ff] focus:ring-2 focus:ring-[#d6c7ff]/20"
                />
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#f4f3ee]">Gift card payout rates</h3>
                  <span className="text-xs text-[#a9afa9]">Toggle cards on only when buying</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pricing.giftCardRates.map((rate) => (
                    <label key={rate.id} className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-3">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#d7dbd4]">{rate.brand}</span>
                        <span className="flex items-center gap-2 text-xs font-semibold text-[#a9afa9]">
                          Buying
                          <input
                            type="checkbox"
                            checked={rate.isActive}
                            onChange={(event) => toggleGiftCardBuying(rate.brand, event.target.checked)}
                            className="peer sr-only"
                          />
                          <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-[#343a38] transition peer-checked:bg-[#c6f65c] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-[#f4f3ee] after:transition peer-checked:after:translate-x-5" />
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                          value={rate.payoutPercent}
                          onChange={(event) => updateGiftCardRate(rate.brand, Number(event.target.value))}
                          className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm text-[#f4f3ee] outline-none focus:border-[#d6c7ff]"
                        />
                        <span className="text-sm text-[#a9afa9]">%</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {pricingMessage && <p role="status" className="text-sm font-medium text-[#d6c7ff]">{pricingMessage}</p>}
              <button type="submit" disabled={pricingSaving} className="w-full rounded-xl bg-[#d6c7ff] px-5 py-3 font-bold text-[#161818] transition hover:bg-[#e5dcff] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                {pricingSaving ? "Saving prices..." : "Save daily pricing"}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-[#a9afa9]">Loading pricing controls...</p>
          )}
        </section>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-center text-[#a9afa9] shadow-lg shadow-black/20">
            No pending orders. You are all caught up! 🎉
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-[#f4f3ee]/10 border-l-4 border-l-[#c6f65c] bg-[#202323] p-6 shadow-lg shadow-black/20">
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-[#f4f3ee]">
                      {order.giftCardBrand} ({order.giftCardCountry}) - {formatNaira(order.amount)}
                    </h2>
                    <p className="text-sm text-[#a9afa9]">User: {order.user.email}</p>
                    <p className="text-sm text-[#a9afa9]">
                      Submitted: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-[#a9afa9]">Rate: {order.rate}</p>
                    <p className="text-2xl font-bold text-[#c6f65c]">
                      Payout: {formatNaira(order.totalValue)}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-3 rounded-lg bg-[#1a1d1d] p-4">
                  {order.giftCardImage && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs font-semibold text-[#a9afa9]">UPLOADED IMAGE:</p>
                      <Image
                        src={order.giftCardImage} 
                        alt="Gift Card" 
                        width={320}
                        height={180}
                        unoptimized
                        className="max-w-xs rounded-lg border border-white/10 shadow-sm"
                      />
                    </div>
                  )}
                  <div className="break-all space-y-1 font-mono text-sm text-[#d7dbd4]">
                    <p><strong>Code:</strong> {order.giftCardCode?.split(' | ')[0] || 'N/A'}</p>
                    <p><strong>PIN:</strong> {order.giftCardCode?.split(' | ')[1] || 'N/A'}</p>
                  </div> {/* 2. FIXED: Removed the word "recent" from the closing tag */}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => handleAction(order.id, "APPROVE")}
                    disabled={actionLoading === order.id}
                    className="flex-1 rounded-lg bg-[#c6f65c] py-2 font-semibold text-[#161818] transition hover:bg-[#d9ff86] disabled:opacity-50"
                  >
                    {actionLoading === order.id ? "Processing..." : "✅ Approve & Pay"}
                  </button>
                  <button
                    onClick={() => handleAction(order.id, "REJECT")}
                    disabled={actionLoading === order.id}
                    className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {actionLoading === order.id ? "Processing..." : "❌ Reject"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
