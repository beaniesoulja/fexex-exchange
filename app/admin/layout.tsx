"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, type ReactNode } from "react";
import { ProfileMenu } from "@/components/profile-menu";
import { canEnterAdminArea, canManageRates, canVerifyTrades, isFullAdmin } from "@/lib/admin-access";
import { AdminProvider, useAdmin } from "./admin-context";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: "📊", allowed: isFullAdmin },
  { href: "/admin/verification", label: "Verify trades", icon: "✅", allowed: canVerifyTrades },
  { href: "/admin/support", label: "Support", icon: "💬", allowed: isFullAdmin },
  { href: "/admin/rates", label: "Rates & catalog", icon: "💱", allowed: canManageRates },
  { href: "/admin/operations", label: "Users & safeguards", icon: "🛡️", allowed: isFullAdmin },
  { href: "/admin/team", label: "Team", icon: "👥", allowed: isFullAdmin },
];

function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { orders, supportTickets } = useAdmin();
  const openTicketCount = supportTickets.filter((ticket) => ticket.status === "OPEN").length;
  const visibleItems = NAV_ITEMS.filter((item) => item.allowed(session?.user));

  return (
    <nav className="mt-6 flex gap-2 overflow-x-auto border-t border-[#f4f3ee]/10 pt-4" aria-label="Admin workspace">
      {visibleItems.map((item) => {
        const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const label = item.href === "/admin/verification" && orders.length
          ? `${item.label} (${orders.length})`
          : item.href === "/admin/support" && openTicketCount
            ? `${item.label} (${openTicketCount})`
            : item.label;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${isActive ? "bg-[#c6f65c] text-[#151817]" : "bg-[#202323] text-[#cdd2cb] hover:bg-[#2a302d]"}`}
          >
            <span aria-hidden="true" className="mr-1.5">{item.icon}</span>{label}
          </Link>
        );
      })}
    </nav>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { ordersLoading } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    const currentItem = NAV_ITEMS.find((item) => item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href));
    if (currentItem && !currentItem.allowed(session?.user)) {
      const firstAllowed = NAV_ITEMS.find((item) => item.allowed(session?.user));
      router.replace(firstAllowed?.href ?? "/trade");
    }
  }, [status, session, pathname, router]);

  if (status === "loading" || ordersLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#161818] p-8 text-center text-xl text-[#a9afa9]">Loading secure dashboard...</div>;
  }

  const roleLabel = isFullAdmin(session?.user) ? "System manager" : "Sub-admin";

  return (
    <main className="fexex-surface min-h-screen bg-[#111414] p-4 text-[#f4f3ee] md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="fexex-fade-in mb-5 rounded-3xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c6f65c] text-lg font-black text-[#151817]">F</span>
                <div><p className="text-xs font-bold tracking-[0.24em] text-[#c6f65c]">FEXEX CONTROL ROOM</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Exchange operations <span aria-hidden="true">🚦</span></h1></div>
              </div>
              <p className="mt-3 break-all text-sm text-[#a9afa9]">Signed in as {session?.user?.email} · {roleLabel}</p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#f4f3ee]/10 bg-[#141717] px-4 py-3 lg:justify-end">
              <div><p className="flex items-center gap-2 text-xs font-semibold text-[#d8ff96]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#c6f65c]" />Live operations</p><p className="mt-1 text-xs text-[#777a75]">Trades refresh every 15s · Analytics every 60s</p></div>
              <ProfileMenu username={session?.user?.username} avatarData={session?.user?.avatarData} />
            </div>
          </div>
          <AdminNav />
        </header>

        {children}
      </div>
    </main>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !canEnterAdminArea(session?.user)) {
      router.push("/login");
    }
  }, [status, session, router]);

  if (status !== "authenticated" || !canEnterAdminArea(session?.user)) {
    return <div className="flex min-h-screen items-center justify-center bg-[#161818] p-8 text-center text-xl text-[#a9afa9]">Loading secure dashboard...</div>;
  }

  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
