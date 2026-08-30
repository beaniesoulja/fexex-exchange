// app/admin/page.tsx
"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/currency";
import { ProfileMenu } from "@/components/profile-menu";

// 1. FIXED: Added giftCardImage to the interface
interface Order {
  id: string;
  type: string;
  amount: number;
  rate: number;
  totalValue: number;
  giftCardBrand: string | null;
  giftCardCountry: string | null;
  giftCardSubcategory: string | null;
  giftCardCode: string | null;
  giftCardImage: string | null; // <-- Added this
  cryptoAsset: string | null;
  payoutBankName: string | null;
  payoutAccountName: string | null;
  payoutBankAccountNumber: string | null;
  createdAt: string;
  user: { email: string };
}

interface GiftCardRate {
  id: string;
  brand: string;
  code: string | null;
  icon: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
  subcategories: GiftCardSubcategory[];
}

interface GiftCardSubcategory {
  id: string;
  label: string;
  country: string | null;
  cardType: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
}

interface CryptoRate {
  id: string;
  asset: string;
  name: string | null;
  icon: string | null;
  nairaPayoutPerUsd: number;
  isActive: boolean;
}

interface Pricing {
  usdToNairaRate: number;
  giftCardRates: GiftCardRate[];
  cryptoRates: CryptoRate[];
  updatedAt: string;
}

interface UserSummary {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  isOnline: boolean;
  tradeCount: number;
  tradeVolume: number;
}

interface Activity {
  id: string;
  type: string;
  details: string | null;
  createdAt: string;
  user: { email: string };
}

interface Analytics {
  generatedAt: string;
  onlineWindowMinutes: number;
  stats: {
    totalUsers: number;
    onlineUsers: number;
    totalTrades: number;
    pendingTrades: number;
    successfulTrades: number;
    declinedTrades: number;
  };
  users: UserSummary[];
  topUsers: UserSummary[];
  recentActivities: Activity[];
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
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
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogSaving, setCatalogSaving] = useState<"giftcard" | "crypto" | null>(null);
  const [newGiftCard, setNewGiftCard] = useState({ brand: "", code: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
  const [newCrypto, setNewCrypto] = useState({ asset: "", name: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
  const [selectedGiftCardBrand, setSelectedGiftCardBrand] = useState("");
  const [newSubcategory, setNewSubcategory] = useState({ label: "", country: "", cardType: "", nairaPayoutPerUsd: "", isActive: true });
  const [subcategorySaving, setSubcategorySaving] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsError, setAnalyticsError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      setAnalytics(await res.json());
      setAnalyticsError("");
    } catch (error) {
      console.error("Failed to fetch analytics", error);
      setAnalyticsError("We could not load user activity right now.");
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
      void fetch("/api/admin/analytics")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load analytics");
          return res.json();
        })
        .then(setAnalytics)
        .catch((error) => {
          console.error("Failed to fetch analytics", error);
          setAnalyticsError("We could not load user activity right now.");
        });
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    const refreshLiveData = () => {
      void fetch("/api/admin/orders")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load orders");
          return res.json();
        })
        .then(setOrders)
        .catch((error) => console.error("Failed to refresh orders", error));
      void fetch("/api/admin/analytics")
        .then(async (res) => {
          if (!res.ok) throw new Error("Failed to load analytics");
          return res.json();
        })
        .then(setAnalytics)
        .catch((error) => {
          console.error("Failed to refresh analytics", error);
          setAnalyticsError("We could not load user activity right now.");
        });
    };

    const interval = window.setInterval(refreshLiveData, 3_000);
    return () => window.clearInterval(interval);
  }, [status, session]);

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
        void fetchAnalytics();
        alert(`✅ ${action === "APPROVE" ? "Withdrawal approved" : "Order rejected"}!`);
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

  const updateGiftCardRate = (brand: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) =>
        rate.brand === brand ? { ...rate, nairaPayoutPerUsd } : rate,
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

  const updateSubcategoryRate = (id: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) => ({
        ...rate,
        subcategories: rate.subcategories.map((subcategory) => subcategory.id === id ? { ...subcategory, nairaPayoutPerUsd } : subcategory),
      })),
    } : current);
  };

  const toggleSubcategoryBuying = (id: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      giftCardRates: current.giftCardRates.map((rate) => ({
        ...rate,
        subcategories: rate.subcategories.map((subcategory) => subcategory.id === id ? { ...subcategory, isActive } : subcategory),
      })),
    } : current);
  };

  const updateCryptoRate = (asset: string, nairaPayoutPerUsd: number) => {
    setPricing((current) => current ? {
      ...current,
      cryptoRates: current.cryptoRates.map((rate) => rate.asset === asset ? { ...rate, nairaPayoutPerUsd } : rate),
    } : current);
  };

  const toggleCryptoBuying = (asset: string, isActive: boolean) => {
    setPricing((current) => current ? {
      ...current,
      cryptoRates: current.cryptoRates.map((rate) => rate.asset === asset ? { ...rate, isActive } : rate),
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
          giftCardRates: pricing.giftCardRates.map(({ brand, nairaPayoutPerUsd, isActive }) => ({ brand, nairaPayoutPerUsd, isActive })),
          cryptoRates: pricing.cryptoRates.map(({ asset, nairaPayoutPerUsd, isActive }) => ({ asset, nairaPayoutPerUsd, isActive })),
          giftCardSubcategories: pricing.giftCardRates.flatMap((rate) => rate.subcategories.map(({ id, label, nairaPayoutPerUsd, isActive }) => ({ id, label, nairaPayoutPerUsd, isActive }))),
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
        cryptoRates: data.cryptoRates,
      } : current);
      setPricingMessage("Pricing saved. New trades will use these rates.");
    } catch {
      setPricingMessage("A network error occurred. Please try again.");
    } finally {
      setPricingSaving(false);
    }
  };

  const loadPricing = async () => {
    const response = await fetch("/api/admin/pricing");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "We could not refresh the catalog.");
    setPricing(data);
  };

  const addCatalogImage = (event: ChangeEvent<HTMLInputElement>, kind: "giftcard" | "crypto") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setCatalogMessage("Choose an image file under 2MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const icon = typeof reader.result === "string" ? reader.result : "";
      if (kind === "giftcard") setNewGiftCard((current) => ({ ...current, icon }));
      else setNewCrypto((current) => ({ ...current, icon }));
    };
    reader.readAsDataURL(file);
  };

  const createCatalogListing = async (event: FormEvent<HTMLFormElement>, kind: "giftcard" | "crypto") => {
    event.preventDefault();
    setCatalogSaving(kind);
    setCatalogMessage("");
    const listing = kind === "giftcard" ? newGiftCard : newCrypto;
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ...listing, nairaPayoutPerUsd: Number(listing.nairaPayoutPerUsd) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCatalogMessage(data.error ?? "We could not add this listing.");
        return;
      }
      await loadPricing();
      if (kind === "giftcard") setNewGiftCard({ brand: "", code: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
      else setNewCrypto({ asset: "", name: "", icon: "", nairaPayoutPerUsd: "", isActive: true });
      setCatalogMessage(data.message ?? "Catalog listing added.");
    } catch {
      setCatalogMessage("A network error occurred. Please try again.");
    } finally {
      setCatalogSaving(null);
    }
  };

  const createSubcategory = async () => {
    if (!selectedGiftCardBrand) return;
    if (!newSubcategory.label.trim() || newSubcategory.nairaPayoutPerUsd === "") {
      setCatalogMessage("Enter the sub-category name and Naira payout rate first.");
      return;
    }
    setSubcategorySaving(true);
    setCatalogMessage("");
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "giftcard-subcategory", brand: selectedGiftCardBrand, ...newSubcategory, nairaPayoutPerUsd: Number(newSubcategory.nairaPayoutPerUsd) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCatalogMessage(data.error ?? "We could not save this sub-category.");
        return;
      }
      await loadPricing();
      setNewSubcategory({ label: "", country: "", cardType: "", nairaPayoutPerUsd: "", isActive: true });
      setCatalogMessage(data.message ?? "Sub-category saved.");
    } catch {
      setCatalogMessage("A network error occurred. Please try again.");
    } finally {
      setSubcategorySaving(false);
    }
  };

  const selectedGiftCard = pricing?.giftCardRates.find((rate) => rate.brand === selectedGiftCardBrand) ?? null;

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
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
            <span className="text-xs text-[#a9afa9]">Updates automatically</span>
            <ProfileMenu username={session?.user?.username} avatarData={session?.user?.avatarData} />
          </div>
        </div>

        <section className="mb-8" aria-labelledby="activity-heading">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#c6f65c]">OPERATIONS OVERVIEW</p>
              <h2 id="activity-heading" className="mt-1 text-2xl font-bold text-[#f4f3ee]">User activity</h2>
            </div>
            {analytics && <p className="text-xs text-[#a9afa9]">Online = active in the last {analytics.onlineWindowMinutes} minutes</p>}
          </div>

          {analyticsError ? (
            <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{analyticsError}</p>
          ) : !analytics ? (
            <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-6 text-sm text-[#a9afa9]">Loading user activity...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {[
                  ["Total users", analytics.stats.totalUsers, "#d6c7ff"],
                  ["Online now", analytics.stats.onlineUsers, "#c6f65c"],
                  ["All trades", analytics.stats.totalTrades, "#f4f3ee"],
                  ["Pending trades", analytics.stats.pendingTrades, "#f5c76a"],
                  ["Successful", analytics.stats.successfulTrades, "#c6f65c"],
                  ["Declined", analytics.stats.declinedTrades, "#f28b82"],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-4 shadow-lg shadow-black/10">
                    <p className="text-xs font-medium text-[#a9afa9]">{label}</p>
                    <p className="mt-2 text-3xl font-bold" style={{ color: String(color) }}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-5 shadow-lg shadow-black/10">
                  <h3 className="text-lg font-bold text-[#f4f3ee]">Top users</h3>
                  <p className="mt-1 text-xs text-[#a9afa9]">Ranked by total submitted trade value.</p>
                  {analytics.topUsers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#a9afa9]">No trades have been submitted yet.</p>
                  ) : (
                    <ol className="mt-4 space-y-3">
                      {analytics.topUsers.map((user, index) => (
                        <li key={user.id} className="flex items-center gap-3 border-b border-[#f4f3ee]/10 pb-3 last:border-0 last:pb-0">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#d6c7ff]/15 text-xs font-bold text-[#e5dcff]">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#f4f3ee]">{user.email}</p>
                            <p className="text-xs text-[#a9afa9]">{user.tradeCount} trade{user.tradeCount === 1 ? "" : "s"}</p>
                          </div>
                          <p className="text-sm font-bold text-[#c6f65c]">{formatNaira(user.tradeVolume)}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-5 shadow-lg shadow-black/10">
                  <h3 className="text-lg font-bold text-[#f4f3ee]">Recent activity</h3>
                  {analytics.recentActivities.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#a9afa9]">Login and trade activity will appear here.</p>
                  ) : (
                    <ol className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                      {analytics.recentActivities.map((activity) => (
                        <li key={activity.id} className="border-b border-[#f4f3ee]/10 pb-3 last:border-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 break-all text-sm font-semibold text-[#f4f3ee]">{activity.user.email}</p>
                            <p className="shrink-0 text-xs text-[#777a75]">{new Date(activity.createdAt).toLocaleString()}</p>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-[#d6c7ff]">{activity.type.replaceAll("_", " ")}</p>
                          {activity.details && <p className="mt-1 text-sm text-[#a9afa9]">{activity.details}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] shadow-lg shadow-black/10">
                <div className="border-b border-[#f4f3ee]/10 px-5 py-4">
                  <h3 className="text-lg font-bold text-[#f4f3ee]">All users</h3>
                  <p className="mt-1 text-xs text-[#a9afa9]">Last login, current activity and lifetime trading overview.</p>
                </div>
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-[#f4f3ee]/10 text-xs text-[#a9afa9]">
                    <tr>
                      <th className="px-5 py-3 font-medium">User</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Last login</th>
                      <th className="px-5 py-3 font-medium">Trades</th>
                      <th className="px-5 py-3 font-medium">Trade value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.users.map((user) => (
                      <tr key={user.id} className="border-b border-[#f4f3ee]/10 last:border-0">
                        <td className="max-w-[260px] break-all px-5 py-4 font-medium text-[#f4f3ee]">{user.email}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isOnline ? "bg-[#c6f65c]/15 text-[#d8ff96]" : "bg-[#f4f3ee]/10 text-[#a9afa9]"}`}>{user.isOnline ? "Online" : "Offline"}</span>
                        </td>
                        <td className="px-5 py-4 text-[#a9afa9]">{formatDateTime(user.lastLoginAt)}</td>
                        <td className="px-5 py-4 text-[#d7dbd4]">{user.tradeCount}</td>
                        <td className="px-5 py-4 font-semibold text-[#c6f65c]">{formatNaira(user.tradeVolume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-[#d6c7ff]/25 bg-[#202323] p-5 shadow-lg shadow-black/20 sm:p-6" aria-labelledby="pricing-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#d6c7ff]">DAILY PRICING</p>
              <h2 id="pricing-heading" className="mt-1 text-2xl font-bold text-[#f4f3ee]">Trade rates</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a9afa9]">Set the USD / USDT to Naira rate and each gift card&apos;s Naira payout. Changes apply only to new trades.</p>
            </div>
          </div>

          {pricing ? (
            <>
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
                  <h3 className="text-sm font-semibold text-[#f4f3ee]">Gift card payout rates in Naira per USD</h3>
                  <span className="text-xs text-[#a9afa9]">Toggle cards on only when buying</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pricing.giftCardRates.map((rate) => (
                    <label key={rate.id} onClick={() => setSelectedGiftCardBrand(rate.brand)} className={`cursor-pointer rounded-xl border bg-[#1a1d1d] p-3 transition ${selectedGiftCardBrand === rate.brand ? "border-[#c6f65c] ring-2 ring-[#c6f65c]/20" : "border-[#f4f3ee]/10 hover:border-[#c6f65c]/50"}`}>
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
                          max="1000000"
                          step="1"
                          required
                  value={rate.nairaPayoutPerUsd}
                          onChange={(event) => updateGiftCardRate(rate.brand, Number(event.target.value))}
                          className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm text-[#f4f3ee] outline-none focus:border-[#d6c7ff]"
                        />
                        <span className="text-xs text-[#a9afa9]">₦ / $1</span>
                      </span>
                    </label>
                  ))}
                </div>
                {selectedGiftCard && (
                  <div className="mt-5 rounded-2xl border border-[#c6f65c]/25 bg-[#c6f65c]/5 p-4 sm:p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-xs font-semibold tracking-wide text-[#c6f65c]">{selectedGiftCard.brand.toUpperCase()} SUB-CATEGORIES</p><h4 className="mt-1 font-bold text-[#f4f3ee]">Country and card-type payout rates</h4></div>
                      <span className="text-xs text-[#a9afa9]">Set a rate and turn on only the variants you are buying.</span>
                    </div>
                    {selectedGiftCard.subcategories.length === 0 ? <p className="mt-4 text-sm text-[#a9afa9]">No sub-categories yet. Add the first one below.</p> : <div className="mt-4 space-y-3">{selectedGiftCard.subcategories.map((subcategory) => <div key={subcategory.id} className="grid gap-3 rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center"><div className="min-w-0"><p className="text-sm font-semibold text-[#f4f3ee]">{subcategory.label}</p><p className="mt-1 text-xs text-[#a9afa9]">{[subcategory.country, subcategory.cardType].filter(Boolean).join(" · ") || "Custom card type"}</p></div><label className="flex items-center gap-2"><input type="number" min="0" max="1000000" step="1" value={subcategory.nairaPayoutPerUsd} onChange={(event) => updateSubcategoryRate(subcategory.id, Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm outline-none focus:border-[#c6f65c]" /><span className="shrink-0 text-xs text-[#a9afa9]">₦/$1</span></label><label className="flex items-center gap-2 text-xs font-semibold text-[#d7dbd4]"><input type="checkbox" checked={subcategory.isActive} onChange={(event) => toggleSubcategoryBuying(subcategory.id, event.target.checked)} /> Buying</label></div>)}</div>}
                    <div className="mt-5 border-t border-[#f4f3ee]/10 pt-5">
                      <p className="text-sm font-semibold text-[#f4f3ee]">Add a {selectedGiftCard.brand} sub-category</p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={newSubcategory.label} onChange={(event) => setNewSubcategory((current) => ({ ...current, label: event.target.value }))} placeholder="Display name / denominations" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input value={newSubcategory.country} onChange={(event) => setNewSubcategory((current) => ({ ...current, country: event.target.value }))} placeholder="Country" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input value={newSubcategory.cardType} onChange={(event) => setNewSubcategory((current) => ({ ...current, cardType: event.target.value }))} placeholder="Card type e.g. Ecode" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /><input type="number" min="0" max="1000000" step="1" value={newSubcategory.nairaPayoutPerUsd} onChange={(event) => setNewSubcategory((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" /></div>
                      <label className="mt-3 flex items-center gap-2 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newSubcategory.isActive} onChange={(event) => setNewSubcategory((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this sub-category</label>
                      <button type="button" onClick={() => void createSubcategory()} disabled={subcategorySaving} className="mt-4 rounded-xl bg-[#c6f65c] px-4 py-2.5 text-sm font-bold text-[#161818] disabled:opacity-60">{subcategorySaving ? "Saving..." : "Add sub-category"}</button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-[#f4f3ee]">Crypto payout rates in Naira per USD</h3>
                  <span className="text-xs text-[#a9afa9]">Toggle assets on only when buying</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pricing.cryptoRates.map((rate) => (
                    <label key={rate.id} className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-3">
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[#d7dbd4]">{rate.asset}</span>
                        <span className="flex items-center gap-2 text-xs font-semibold text-[#a9afa9]">
                          Buying
                          <input type="checkbox" checked={rate.isActive} onChange={(event) => toggleCryptoBuying(rate.asset, event.target.checked)} className="peer sr-only" />
                          <span aria-hidden="true" className="relative h-6 w-11 rounded-full bg-[#343a38] transition peer-checked:bg-[#c6f65c] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-[#f4f3ee] after:transition peer-checked:after:translate-x-5" />
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        <input type="number" inputMode="decimal" min="0" max="1000000" step="1" required value={rate.nairaPayoutPerUsd} onChange={(event) => updateCryptoRate(rate.asset, Number(event.target.value))} className="min-w-0 flex-1 rounded-lg border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2 text-sm text-[#f4f3ee] outline-none focus:border-[#d6c7ff]" />
                        <span className="text-xs text-[#a9afa9]">₦ / $1</span>
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
            <div className="mt-8 grid gap-5 border-t border-[#f4f3ee]/10 pt-6 lg:grid-cols-2">
              <form onSubmit={(event) => void createCatalogListing(event, "giftcard")} className="rounded-2xl border border-[#c6f65c]/25 bg-[#1a1d1d] p-5">
                <p className="text-xs font-semibold tracking-wide text-[#c6f65c]">CATALOG</p>
                <h3 className="mt-1 text-lg font-bold text-[#f4f3ee]">Add gift card</h3>
                <p className="mt-1 text-xs leading-5 text-[#a9afa9]">Add a card name, its customer-facing code, image, Naira price, and buying status.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input required value={newGiftCard.brand} onChange={(event) => setNewGiftCard((current) => ({ ...current, brand: event.target.value }))} placeholder="Gift card name" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
                  <input required value={newGiftCard.code} onChange={(event) => setNewGiftCard((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Code e.g. NKE" maxLength={16} className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#c6f65c]" />
                  <input required type="number" min="0" max="1000000" step="1" value={newGiftCard.nairaPayoutPerUsd} onChange={(event) => setNewGiftCard((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
                  <label className="flex items-center gap-2 rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newGiftCard.isActive} onChange={(event) => setNewGiftCard((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this card</label>
                </div>
                <label className="mt-3 block text-xs font-medium text-[#d7dbd4]">Image URL or upload</label>
                <input required={!newGiftCard.icon.startsWith("data:")} type="url" value={newGiftCard.icon.startsWith("data:") ? "" : newGiftCard.icon} onChange={(event) => setNewGiftCard((current) => ({ ...current, icon: event.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#c6f65c]" />
                <input type="file" accept="image/*" onChange={(event) => addCatalogImage(event, "giftcard")} className="mt-2 block w-full text-xs text-[#a9afa9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#c6f65c] file:px-3 file:py-2 file:font-semibold file:text-[#161818]" />
                {newGiftCard.icon && <p className="mt-2 text-xs text-[#d8ff96]">Gift-card image ready.</p>}
                <button type="submit" disabled={catalogSaving !== null} className="mt-4 w-full rounded-xl bg-[#c6f65c] px-4 py-3 text-sm font-bold text-[#161818] disabled:opacity-60">{catalogSaving === "giftcard" ? "Adding gift card..." : "Add gift card"}</button>
              </form>

              <form onSubmit={(event) => void createCatalogListing(event, "crypto")} className="rounded-2xl border border-[#d6c7ff]/25 bg-[#1a1d1d] p-5">
                <p className="text-xs font-semibold tracking-wide text-[#d6c7ff]">CATALOG</p>
                <h3 className="mt-1 text-lg font-bold text-[#f4f3ee]">Add crypto asset</h3>
                <p className="mt-1 text-xs leading-5 text-[#a9afa9]">List another asset FEXEX can buy, set its Naira price, and control whether it is live.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input required value={newCrypto.asset} onChange={(event) => setNewCrypto((current) => ({ ...current, asset: event.target.value.toUpperCase() }))} placeholder="Ticker e.g. XRP" maxLength={16} className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#d6c7ff]" />
                  <input required value={newCrypto.name} onChange={(event) => setNewCrypto((current) => ({ ...current, name: event.target.value }))} placeholder="Name e.g. XRP" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#d6c7ff]" />
                  <input required type="number" min="0" max="1000000" step="1" value={newCrypto.nairaPayoutPerUsd} onChange={(event) => setNewCrypto((current) => ({ ...current, nairaPayoutPerUsd: event.target.value }))} placeholder="Naira per $1" className="rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#d6c7ff]" />
                  <label className="flex items-center gap-2 rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm text-[#d7dbd4]"><input type="checkbox" checked={newCrypto.isActive} onChange={(event) => setNewCrypto((current) => ({ ...current, isActive: event.target.checked }))} /> FEXEX is buying this asset</label>
                </div>
                <label className="mt-3 block text-xs font-medium text-[#d7dbd4]">Icon URL or upload <span className="text-[#777a75]">(optional)</span></label>
                <input type="url" value={newCrypto.icon.startsWith("data:") ? "" : newCrypto.icon} onChange={(event) => setNewCrypto((current) => ({ ...current, icon: event.target.value }))} placeholder="https://..." className="mt-1 w-full rounded-xl border border-[#f4f3ee]/15 bg-[#202323] px-3 py-2.5 text-sm outline-none focus:border-[#d6c7ff]" />
                <input type="file" accept="image/*" onChange={(event) => addCatalogImage(event, "crypto")} className="mt-2 block w-full text-xs text-[#a9afa9] file:mr-3 file:rounded-lg file:border-0 file:bg-[#d6c7ff] file:px-3 file:py-2 file:font-semibold file:text-[#161818]" />
                {newCrypto.icon && <p className="mt-2 text-xs text-[#e5dcff]">Crypto icon ready.</p>}
                <button type="submit" disabled={catalogSaving !== null} className="mt-4 w-full rounded-xl bg-[#d6c7ff] px-4 py-3 text-sm font-bold text-[#161818] disabled:opacity-60">{catalogSaving === "crypto" ? "Adding crypto..." : "Add crypto asset"}</button>
              </form>
            </div>
            {catalogMessage && <p role="status" className="mt-4 text-sm font-medium text-[#d6c7ff]">{catalogMessage}</p>}
            </>
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
                      {order.type === "SELL_CRYPTO" ? `${order.cryptoAsset ?? "Crypto"} withdrawal · $${order.amount.toLocaleString()}` : `${order.giftCardBrand} (${order.giftCardSubcategory ?? order.giftCardCountry}) - $${order.amount.toLocaleString()}`}
                    </h2>
                    <p className="text-sm text-[#a9afa9]">User: {order.user.email}</p>
                    <p className="text-sm text-[#a9afa9]">
                      Submitted: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-bold text-[#c6f65c]">
                      Payout: {formatNaira(order.totalValue)}
                    </p>
                  </div>
                </div>

                <div className="mb-4 space-y-3 rounded-lg bg-[#1a1d1d] p-4">
                  {order.type === "SELL_CRYPTO" ? (
                    <div className="space-y-1 text-sm text-[#d7dbd4]">
                      <p className="text-xs font-semibold text-[#a9afa9]">DEFAULT WITHDRAWAL ACCOUNT</p>
                      <p><strong>Bank:</strong> {order.payoutBankName ?? "Not saved"}</p>
                      <p><strong>Account name:</strong> {order.payoutAccountName ?? "Not saved"}</p>
                      <p><strong>Account number:</strong> {order.payoutBankAccountNumber ?? "Not saved"}</p>
                    </div>
                  ) : <>
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
                  </>}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {order.type === "SELL_GIFTCARD" && <Link href={`/trade/${order.id}`} className="flex-1 rounded-lg border border-[#d6c7ff]/50 px-4 py-2 text-center font-semibold text-[#e5dcff] transition hover:bg-[#d6c7ff]/10">Open escrow chat</Link>}
                  <button
                    onClick={() => handleAction(order.id, "APPROVE")}
                    disabled={actionLoading === order.id}
                    className="flex-1 rounded-lg bg-[#c6f65c] py-2 font-semibold text-[#161818] transition hover:bg-[#d9ff86] disabled:opacity-50"
                  >
                    {actionLoading === order.id ? "Processing..." : order.type === "SELL_CRYPTO" ? "✅ Approve withdrawal" : "✅ Approve & Pay"}
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
