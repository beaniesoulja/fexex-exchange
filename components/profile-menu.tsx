"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";

interface ProfileMenuProps {
  username?: string;
  avatarData?: string;
}

export function ProfileMenu({ username, avatarData }: ProfileMenuProps) {
  const label = username ? `@${username}` : "My account";

  return (
    <details className="relative shrink-0">
      <summary aria-label="Open profile menu" className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-[#c6f65c]/45 bg-[#2a2e2d] transition hover:border-[#c6f65c] hover:bg-[#343a38] [&::-webkit-details-marker]:hidden">
        <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="" width={32} height={32} unoptimized={Boolean(avatarData)} className="h-8 w-8 rounded-full object-cover" />
      </summary>
      <div className="absolute right-0 z-30 mt-3 w-60 overflow-hidden rounded-2xl border border-[#f4f3ee]/10 bg-[#202323] p-2 shadow-2xl shadow-black/50">
        <div className="border-b border-[#f4f3ee]/10 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-[#f4f3ee]">{label}</p>
          <p className="mt-0.5 text-xs text-[#a9afa9]">FEXEX account</p>
        </div>
        <div className="py-1">
          <Link href="/profile" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">My profile</Link>
          <Link href="/verification" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Verification</Link>
          <Link href="/security" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Account security</Link>
          <Link href="/activity" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Activity log</Link>
          <Link href="/wallet#settings" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Settings</Link>
          <Link href="/help-center" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">Help Center</Link>
          <Link href="/about" className="block rounded-xl px-3 py-2.5 text-sm text-[#d7dbd4] transition hover:bg-[#2a2e2d] hover:text-[#c6f65c]">About us</Link>
        </div>
        <div className="border-t border-[#f4f3ee]/10 pt-1">
          <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-200 transition hover:bg-red-400/10">Logout</button>
        </div>
      </div>
    </details>
  );
}
