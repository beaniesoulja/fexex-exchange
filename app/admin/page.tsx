// app/admin/page.tsx
"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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
        alert(`✅ Order ${action === "APPROVE" ? "Approved & Wallet Credited" : "Rejected"}!`);
      } else {
        alert("❌ Failed to process order.");
      }
    } catch {
      alert("❌ Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) return <div className="p-8 text-center text-xl">Loading secure dashboard...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Logged in as: {session?.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchOrders} className="text-blue-600 hover:underline">
              🔄 Refresh
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow text-center text-gray-500">
            No pending orders. You are all caught up! 🎉
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-400">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      {order.giftCardBrand} ({order.giftCardCountry}) - ${order.amount}
                    </h2>
                    <p className="text-sm text-gray-500">User: {order.user.email}</p>
                    <p className="text-sm text-gray-500">
                      Submitted: {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Rate: {order.rate}</p>
                    <p className="text-2xl font-bold text-green-600">
                      Payout: ${order.totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                  {order.giftCardImage && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">UPLOADED IMAGE:</p>
                      <Image
                        src={order.giftCardImage} 
                        alt="Gift Card" 
                        width={320}
                        height={180}
                        unoptimized
                        className="max-w-xs rounded-lg border border-gray-300 shadow-sm" 
                      />
                    </div>
                  )}
                  <div className="font-mono text-sm break-all space-y-1">
                    <p><strong>Code:</strong> {order.giftCardCode?.split(' | ')[0] || 'N/A'}</p>
                    <p><strong>PIN:</strong> {order.giftCardCode?.split(' | ')[1] || 'N/A'}</p>
                  </div> {/* 2. FIXED: Removed the word "recent" from the closing tag */}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction(order.id, "APPROVE")}
                    disabled={actionLoading === order.id}
                    className="flex-1 bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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
