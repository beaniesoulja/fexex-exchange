"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { ProfileMenu } from "@/components/profile-menu";
import { SettingsSidebar } from "@/components/settings-sidebar";

type Session = {
  id: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  location: string | null;
  active: boolean;
  createdAt: string;
};

type ActivityEntry = {
  id: string;
  type: string;
  details: string | null;
  createdAt: string;
};

export default function Activity() {
  const { data, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [tab, setTab] = useState<"sessions" | "activity">("sessions");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetch("/api/user/sessions")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setSessions(data?.sessions ?? []))
      .catch(() => setSessions([]));
    void fetch("/api/user/activity")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setActivities(data?.activities ?? []))
      .catch(() => setActivities([]));
  }, [status]);

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex justify-between">
          <Link href="/trade" className="font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={data?.user?.username} avatarData={data?.user?.avatarData} />
        </header>
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        <SettingsSidebar />
        <section className="flex-1 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="text-2xl font-bold">Activity log</h1>
          <p className="mt-1 text-sm text-[#5e6863]">Review recent activity for better security and transparency</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => setTab("sessions")} className={`rounded-xl px-4 py-2 font-bold ${tab === "sessions" ? "bg-[#c6f65c]" : "bg-[#eff1ed]"}`}>Active sessions</button>
            <button type="button" onClick={() => setTab("activity")} className={`rounded-xl px-4 py-2 font-bold ${tab === "activity" ? "bg-[#c6f65c]" : "bg-[#eff1ed]"}`}>Account activity</button>
          </div>

          {tab === "sessions" ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[#5e6863]">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Logged in</th>
                    <th className="py-2 pr-4 font-medium">Browser</th>
                    <th className="py-2 pr-4 font-medium">OS</th>
                    <th className="py-2 pr-4 font-medium">IP Address</th>
                    <th className="py-2 pr-4 font-medium">Location</th>
                    <th className="py-2 font-medium">Current</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-[#5e6863]">No sessions recorded yet.</td></tr>
                  ) : sessions.map((session, index) => (
                    <tr key={session.id} className="border-t border-[#eff1ed]">
                      <td className="py-4 pr-4 font-semibold">{new Date(session.createdAt).toLocaleString()}</td>
                      <td className="py-4 pr-4">{session.browser}</td>
                      <td className="py-4 pr-4">{session.os}</td>
                      <td className="py-4 pr-4">{session.ipAddress ?? "Private"}</td>
                      <td className="py-4 pr-4">{session.location ?? "Not available"}</td>
                      <td className="py-4">{index === 0 ? "✓ Current" : "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[#5e6863]">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr><td colSpan={2} className="py-8 text-center text-[#5e6863]">No account activity recorded yet.</td></tr>
                  ) : activities.map((entry) => (
                    <tr key={entry.id} className="border-t border-[#eff1ed]">
                      <td className="py-4 pr-4">
                        <p className="font-semibold">{entry.type.replaceAll("_", " ")}</p>
                        {entry.details && <p className="mt-0.5 text-xs text-[#5e6863]">{entry.details}</p>}
                      </td>
                      <td className="py-4">{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>
      </div>
    </main>
  );
}
