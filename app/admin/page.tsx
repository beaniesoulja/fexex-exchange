// app/admin/page.tsx
"use client";
import Link from "next/link";
import { formatNaira } from "@/lib/currency";
import { useAdmin } from "./admin-context";
import { formatDateTime } from "./admin-types";

export default function AdminOverviewPage() {
  const { orders, pricing, analytics, analyticsError } = useAdmin();
  const liveAssets = (pricing?.cryptoRates ?? []).filter((rate) => rate.isActive).slice(0, 4);

  return (
    <section className="mb-8" aria-labelledby="activity-heading">
      <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-[#c6f65c]/20 bg-gradient-to-br from-[#253022] to-[#1a1d1d] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold tracking-wide text-[#c6f65c]">LIVE DASHBOARD</p><h2 id="activity-heading" className="mt-1 text-2xl font-bold text-[#f4f3ee]">Everything needing attention, in one place.</h2><p className="mt-2 text-sm text-[#a9afa9]">Review pending trades first, then manage the current customer rates.</p></div>
        <Link href="/admin/verification" className="rounded-xl bg-[#c6f65c] px-4 py-2.5 text-sm font-bold text-[#151817]">Open verification queue</Link>
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#202323]">
        <div className="flex min-w-max items-stretch divide-x divide-[#f4f3ee]/10">
          <div className="px-4 py-3"><p className="text-[10px] font-bold tracking-[0.16em] text-[#777a75]">FEXEX PAYOUT TICKER</p><p className="mt-1 text-xs text-[#a9afa9]">Published buy rates</p></div>
          {liveAssets.length > 0 ? liveAssets.map((asset) => <div key={asset.id} className="min-w-40 px-4 py-3"><p className="text-xs font-semibold text-[#d7dbd4]">{asset.asset}</p><p className="mt-1 text-sm font-bold text-[#d8ff96]">{formatNaira(asset.nairaPayoutPerUsd)} / $1</p></div>) : <div className="px-4 py-3 text-sm text-[#a9afa9]">Loading active crypto rates…</div>}
        </div>
      </div>

      {analytics && <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Today’s volume", formatNaira(analytics.stats.todayVolume), "All submitted trades today", "#c6f65c"],
          ["Pending actions", analytics.stats.pendingTrades, `${analytics.stats.pendingGiftCardTrades} cards · ${analytics.stats.pendingCryptoTrades} crypto`, "#f5c76a"],
          ["Trades today", analytics.stats.todayTrades, "New trade sessions", "#d6c7ff"],
          ["Customers online", analytics.stats.onlineUsers, `Active in the last ${analytics.onlineWindowMinutes} minutes`, "#f4f3ee"],
        ].map(([label, value, detail, color]) => <div key={String(label)} className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-4"><p className="text-xs font-medium text-[#a9afa9]">{label}</p><p className="mt-2 text-2xl font-bold" style={{ color: String(color) }}>{value}</p><p className="mt-1 text-xs text-[#777a75]">{detail}</p></div>)}
      </div>}

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${orders.length ? "border-[#f5c76a]/40 bg-[#f5c76a]/10" : "border-[#c6f65c]/20 bg-[#c6f65c]/5"}`}><p className="text-xs font-bold tracking-wide text-[#f5c76a]">ALERT CENTER</p><p className="mt-2 font-semibold text-[#f4f3ee]">{orders.length ? `${orders.length} trade${orders.length === 1 ? "" : "s"} needs human review` : "No pending trades"}</p><p className="mt-1 text-xs leading-5 text-[#a9afa9]">Every trade remains pending until an authorized admin records an outcome.</p></div>
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-4"><p className="text-xs font-bold tracking-wide text-[#d6c7ff]">ACCESS SAFETY</p><p className="mt-2 font-semibold text-[#f4f3ee]">Admin-only workspace</p><p className="mt-1 text-xs leading-5 text-[#a9afa9]">Customer-facing prices stay separate from the controls in this workspace.</p></div>
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-4"><p className="text-xs font-bold tracking-wide text-[#c6f65c]">AUDIT TRAIL</p><p className="mt-2 font-semibold text-[#f4f3ee]">Live customer activity</p><p className="mt-1 text-xs leading-5 text-[#a9afa9]">Recent sign-ins and submitted trades appear below as they happen.</p></div>
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
  );
}
