"use client";
import { useEffect, useState } from "react";

interface TeamMember {
  id: string;
  email: string;
  username: string | null;
  role: "ADMIN" | "SUB_ADMIN" | "USER";
  canVerifyTrades: boolean;
  canManageRates: boolean;
}

export default function AdminTeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TeamMember[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = (q?: string) => {
    void fetch(`/api/admin/team${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("We could not load the team.");
        return response.json() as Promise<{ team: TeamMember[]; searchResults: TeamMember[] }>;
      })
      .then((data) => {
        setTeam(data.team);
        setSearchResults(data.searchResults);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "We could not load the team."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { if (query.trim()) load(query.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const patch = async (body: Record<string, unknown>) => {
    const userId = body.userId as string;
    setSaving(userId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "We could not update this user.");
      load(query.trim() || undefined);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "We could not update this user.");
    } finally {
      setSaving(null);
    }
  };

  const subAdmins = team.filter((member) => member.role === "SUB_ADMIN");
  const fullAdmins = team.filter((member) => member.role === "ADMIN");

  return (
    <section aria-labelledby="team-heading" className="fexex-pop-in space-y-5">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[#d6c7ff]">TEAM & PERMISSIONS</p>
        <h2 id="team-heading" className="mt-1 text-2xl font-bold">Sub-admins</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#a9afa9]">Give a trusted user limited access to verify trades and/or set rates, without full admin access to users, analytics, or support.</p>
      </div>

      {message && <p role="alert" className="rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200">{message}</p>}

      <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
        <h3 className="text-lg font-bold">Add a sub-admin</h3>
        <p className="mt-1 text-sm text-[#a9afa9]">Search by email or username to promote an existing customer.</p>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email or username"
          className="mt-3 w-full max-w-md rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-4 py-2.5 text-sm outline-none placeholder:text-[#777a75] focus:border-[#c6f65c]"
        />
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.email}</p>
                  <p className="text-xs text-[#a9afa9]">{user.username ? `@${user.username}` : "No username"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void patch({ userId: user.id, makeSubAdmin: true })}
                  disabled={saving === user.id}
                  className="rounded-lg bg-[#c6f65c] px-3 py-2 text-xs font-bold text-[#161818] disabled:opacity-60"
                >
                  {saving === user.id ? "Adding..." : "Make sub-admin"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
        <h3 className="text-lg font-bold">Current sub-admins</h3>
        {loading ? (
          <p className="mt-4 text-sm text-[#a9afa9]">Loading...</p>
        ) : subAdmins.length === 0 ? (
          <p className="mt-4 text-sm text-[#a9afa9]">No sub-admins yet. Search above to add one.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {subAdmins.map((member) => (
              <div key={member.id} className="rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{member.email}</p>
                    <p className="text-xs text-[#a9afa9]">{member.username ? `@${member.username}` : "No username"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void patch({ userId: member.id, removeSubAdmin: true })}
                    disabled={saving === member.id}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {saving === member.id ? "Removing..." : "Remove access"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={member.canVerifyTrades}
                      onChange={(event) => void patch({ userId: member.id, canVerifyTrades: event.target.checked })}
                      disabled={saving === member.id}
                    />
                    Can accept/reject trades
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={member.canManageRates}
                      onChange={(event) => void patch({ userId: member.id, canManageRates: event.target.checked })}
                      disabled={saving === member.id}
                    />
                    Can set rates & catalog
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
        <h3 className="text-lg font-bold">Full admins</h3>
        <p className="mt-1 text-sm text-[#a9afa9]">Full admin access is granted outside this page and cannot be changed here.</p>
        <div className="mt-4 space-y-2">
          {fullAdmins.map((member) => (
            <p key={member.id} className="rounded-xl border border-[#f4f3ee]/10 bg-[#1a1d1d] px-4 py-3 text-sm font-semibold">{member.email}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
