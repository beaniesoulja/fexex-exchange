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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  if (status === "loading" || loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#161818] p-8 text-center text-xl text-[#a9afa9]">Loading secure dashboard...</div>;
  }

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-[#a9afa9]">Logged in as: {session?.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchOrders} className="font-semibold text-[#c6f65c] transition hover:text-[#d9ff86]">
              🔄 Refresh
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="rounded-lg bg-[#2a2e2d] px-4 py-2 text-[#f4f3ee] transition hover:bg-[#343a38]"
            >
              Logout
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-[#f4f3ee]/10 bg-[#202323] p-8 text-center text-[#a9afa9] shadow-lg shadow-black/20">
            No pending orders. You are all caught up! 🎉
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-[#f4f3ee]/10 border-l-4 border-l-[#c6f65c] bg-[#202323] p-6 shadow-lg shadow-black/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#f4f3ee]">
                      {order.giftCardBrand} ({order.giftCardCountry}) - {formatNaira(order.amount)}
                    </h2>
                    <p className="text-sm text-[#a9afa9]">User: {order.user.email}</p>
                    <p className="text-sm text-[#a9afa9]">
                      Submitted: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
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

                <div className="flex gap-3">
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
