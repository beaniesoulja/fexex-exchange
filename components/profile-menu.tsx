"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface ProfileMenuProps {
  username?: string;
  avatarData?: string;
}

export function ProfileMenu({ username, avatarData }: ProfileMenuProps) {
  const label = username ? `@${username}` : "My account";
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePress);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePress);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <div ref={menuRef} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(true)} onFocus={() => setOpen(true)} aria-expanded={open} aria-haspopup="menu" aria-label="Open profile menu" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#c6f65c]/45 bg-[#2a2e2d] transition hover:border-[#c6f65c] hover:bg-[#343a38] focus:outline-none focus:ring-2 focus:ring-[#c6f65c]">
        <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="" width={32} height={32} unoptimized={Boolean(avatarData)} className="h-8 w-8 rounded-full object-cover" />
      </button>
      {open && <div role="menu" className="absolute right-0 top-full z-50 w-60 overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-2 shadow-2xl shadow-black/50">
        <div className="border-b border-[#f4f3ee]/10 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[#f4f3ee]">{label}</p>
          <p className="mt-0.5 text-xs text-[#a9afa9]">FEXEX account</p>
        </div>
        <div className="py-1">
          <Link href="/profile" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">My profile</Link>
          <Link href="/verification" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Verification</Link>
          <Link href="/security" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Account security</Link>
          <Link href="/activity" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Activity log</Link>
          <Link href="/wallet#settings" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Settings</Link>
          <Link href="/help-center" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Help Center</Link>
          <Link href="/about" onClick={close} className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">About us</Link>
        </div>
        <div className="border-t border-[#f4f3ee]/10 pt-1">
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-200 transition hover:bg-red-400/10">Logout</button>
        </div>
      </div>}
    </div>
  );
}
