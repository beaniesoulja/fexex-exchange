"use client";
import { useAdmin } from "../admin-context";

export default function AdminOperationsPage() {
  const { analytics } = useAdmin();

  return (
    <section className="fexex-pop-in mb-8 space-y-5" aria-labelledby="operations-heading">
      <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-[#d6c7ff]">USERS & SAFEGUARDS</p>
        <h2 id="operations-heading" className="mt-1 text-2xl font-bold">Operational access, activity, and the next safety controls.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a9afa9]">The current platform records logins and trade submissions, keeps trade decisions inside the admin queue, and restricts this workspace to admins.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Support agent", "Review card evidence and continue a trade-room conversation. Cannot release funds or edit pricing.", "#c6f65c"],
          ["Risk analyst", "Review customer evidence and recommend a trade outcome. Account blocking needs a dedicated server-side policy before it can be enabled.", "#f5c76a"],
          ["System manager", "Current admin role: review trades, set card and crypto rates, and manage the customer catalog.", "#d6c7ff"],
        ].map(([role, description, color]) => <div key={String(role)} className="rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5"><span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${String(color)}22`, color: String(color) }}>{role}</span><p className="mt-4 text-sm leading-6 text-[#a9afa9]">{description}</p></div>)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-5"><h3 className="text-lg font-bold">Safety coverage</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex items-start justify-between gap-4 border-b border-[#f4f3ee]/10 pb-3"><dt className="text-[#a9afa9]">Trade resolution</dt><dd className="text-right font-semibold text-[#d8ff96]">Recorded with timestamp and customer-visible reason</dd></div><div className="flex items-start justify-between gap-4 border-b border-[#f4f3ee]/10 pb-3"><dt className="text-[#a9afa9]">Pricing changes</dt><dd className="text-right font-semibold text-[#d8ff96]">Admin-only, applies to new trades</dd></div><div className="flex items-start justify-between gap-4"><dt className="text-[#a9afa9]">KYC, bans & IP blocks</dt><dd className="text-right font-semibold text-[#f5c76a]">Not enabled yet — needs enforced backend workflows</dd></div></dl></div>
        <div className="rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-5"><h3 className="text-lg font-bold">Recent activity diary</h3>{analytics?.recentActivities.length ? <ol className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">{analytics.recentActivities.map((activity) => <li key={activity.id} className="border-b border-[#f4f3ee]/10 pb-3 last:border-0"><div className="flex items-start justify-between gap-3"><p className="break-all text-sm font-semibold">{activity.user.email}</p><p className="shrink-0 text-xs text-[#777a75]">{new Date(activity.createdAt).toLocaleString()}</p></div><p className="mt-1 text-xs font-semibold text-[#d6c7ff]">{activity.type.replaceAll("_", " ")}</p>{activity.details && <p className="mt-1 text-sm text-[#a9afa9]">{activity.details}</p>}</li>)}</ol> : <p className="mt-4 text-sm text-[#a9afa9]">No recorded activity yet.</p>}</div>
      </div>
    </section>
  );
}
