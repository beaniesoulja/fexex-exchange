// app/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

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

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [wallet, setWallet] = useState<Wallet>({ fiatBalance: 0, cryptoBalance: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Protect route: Redirect to login if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
    } else {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-gray-600">Loading your dashboard...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>
            <p className="text-gray-500">Welcome back, {session?.user?.email}</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push("/")} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Sell New Card
            </button>
            <button 
              onClick={() => signOut({ callbackUrl: "/login" })} 
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-blue-100 text-sm font-medium mb-1">Fiat Balance (USD)</p>
            <h2 className="text-4xl font-bold">${wallet.fiatBalance.toFixed(2)}</h2>
            <button className="mt-4 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 transition">
              Request Withdrawal
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-6 rounded-2xl shadow-lg text-white">
            <p className="text-purple-100 text-sm font-medium mb-1">Crypto Balance (USDT)</p>
            <h2 className="text-4xl font-bold">{wallet.cryptoBalance.toFixed(4)}</h2>
            <button className="mt-4 bg-white text-purple-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-50 transition">
              Request Withdrawal
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
          
          {orders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No transactions yet. Start by selling a gift card!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Payout</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-4 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-medium text-gray-800">
                        Sell {order.giftCardBrand || order.type.replace('_', ' ')}
                      </td>
                      <td className="py-4 text-gray-600">${order.amount.toFixed(2)}</td>
                      <td className="py-4 font-semibold text-gray-800">${order.totalValue.toFixed(2)}</td>
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