"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ProfileMenu } from "@/components/profile-menu";

type IconName = "home" | "trade" | "wallet" | "support" | "chevron";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z" />,
    trade: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 10h10M7 14h7" /><path d="m15 7 3 3-3 3" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3" /><path d="M3 9h18" /><path d="M16 14h.01" /></>,
    support: <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v5H5a1 1 0 0 1-1-1v-4ZM20 14h-3v5h2a1 1 0 0 0 1-1v-4Z" /><path d="M17 19c0 1.5-1.5 2-3 2h-2" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
  };

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function HeaderLink({ href, icon, children, active }: { href: string; icon: IconName; children: ReactNode; active?: boolean }) {
  return <Link href={href} className={`flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${active ? "bg-[#c6f65c] text-[#161818]" : "text-[#1d2220] hover:bg-[#eff1ed]"}`}>
    <Icon name={icon} />
    <span className="hidden sm:inline">{children}</span>
  </Link>;
}

export function AppHeader({ username, avatarData }: { username?: string; avatarData?: string }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"trade" | "support" | null>(null);
  const closeMenu = () => setOpenMenu(null);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#dde1da] bg-white/95 text-[#1d2220] shadow-sm backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-1 px-3 py-2 sm:gap-2 sm:px-5">
        <nav aria-label="Main navigation" className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
          <Link href="/trade" onClick={closeMenu} aria-label="FEXEX Trade home" className="mr-1 flex shrink-0 items-center gap-2 rounded-lg px-1 py-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#c6f65c] text-lg font-black text-[#161818]">F</span>
            <span className="hidden text-xl font-black tracking-[-0.08em] text-[#161818] sm:inline">FEXEX</span>
          </Link>

          <Link href="/trade" onClick={closeMenu} aria-label="Home — FEXEX Trade" title="Home" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff1ed] text-[#1d2220] transition hover:bg-[#dce7bd]">
            <Icon name="home" />
          </Link>

          <div className="relative shrink-0" onMouseEnter={() => setOpenMenu("trade")} onMouseLeave={() => setOpenMenu((current) => current === "trade" ? null : current)}>
            <button type="button" onClick={() => setOpenMenu("trade")} onFocus={() => setOpenMenu("trade")} aria-expanded={openMenu === "trade"} aria-controls="trade-menu" className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition ${pathname === "/trade" ? "bg-[#c6f65c] text-[#161818]" : "text-[#1d2220] hover:bg-[#eff1ed]"}`}>
              <Icon name="trade" />
              <span className="hidden sm:inline">Trade</span>
              <Icon name="chevron" className={`hidden h-4 w-4 transition sm:block ${openMenu === "trade" ? "rotate-180" : ""}`} />
            </button>
            {openMenu === "trade" && <div id="trade-menu" className="absolute left-0 top-full z-50 w-48 overflow-hidden rounded-xl border border-[#dce0da] bg-white p-1.5 shadow-xl shadow-black/10">
              <Link href="/trade" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-[#eff1ed]">Sell Giftcard</Link>
              <Link href="/trade?type=crypto" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-[#eff1ed]">Sell Crypto</Link>
            </div>}
          </div>

          <HeaderLink href="/wallet" icon="wallet" active={pathname === "/wallet"}>Wallet</HeaderLink>

          <div className="relative shrink-0">
            <button type="button" onClick={() => setOpenMenu(openMenu === "support" ? null : "support")} aria-expanded={openMenu === "support"} aria-controls="support-menu" className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold text-[#1d2220] transition hover:bg-[#eff1ed]">
              <Icon name="support" />
              <span className="hidden sm:inline">Support</span>
              <Icon name="chevron" className={`hidden h-4 w-4 transition sm:block ${openMenu === "support" ? "rotate-180" : ""}`} />
            </button>
            {openMenu === "support" && <div id="support-menu" className="absolute left-0 top-full z-50 w-48 overflow-hidden rounded-xl border border-[#dce0da] bg-white p-1.5 shadow-xl shadow-black/10">
              <Link href="/help-center" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-[#eff1ed]">Help Center</Link>
              <Link href="/activity" onClick={closeMenu} className="block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-[#eff1ed]">Activity log</Link>
            </div>}
          </div>
        </nav>

        <div className="shrink-0 pl-1 sm:pl-2">
          <ProfileMenu username={username} avatarData={avatarData} />
        </div>
      </div>
    </header>
  );
}
