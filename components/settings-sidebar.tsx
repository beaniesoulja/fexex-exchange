"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings", label: "Basic information" },
  { href: "/security", label: "Security" },
  { href: "/activity", label: "Account" },
  { href: "/verification", label: "ID verification" },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="fexex-pop-in w-full shrink-0 rounded-2xl bg-white p-3 shadow-xl shadow-black/5 lg:w-60">
      <p className="px-3 py-2 text-sm font-bold text-[#1d2220]">Account settings</p>
      <ul className="mt-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? "bg-[#eafce0] text-[#3c6b1f]" : "text-[#5e6863] hover:bg-[#eff1ed]"}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
