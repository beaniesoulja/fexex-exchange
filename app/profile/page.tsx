"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ProfileMenu } from "@/components/profile-menu";

interface ProfileData {
  email: string | null;
  username: string | null;
  legalName: string | null;
  dateOfBirth: string | null;
  avatarData: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    void fetch("/api/user/profile")
      .then(async (response) => response.ok ? response.json() : null)
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [status, router]);

  const phone = profile?.phoneCountryCode && profile.phoneNumber ? `${profile.phoneCountryCode} ${profile.phoneNumber}` : "Not provided";
  const dateOfBirth = profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "Not provided";
  const avatarData = profile?.avatarData ?? session?.user?.avatarData;

  const changeAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setAvatarMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 1_000_000) {
      setAvatarMessage("Choose an image smaller than 1 MB.");
      return;
    }

    setAvatarSaving(true);
    setAvatarMessage("");
    try {
      const avatarData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read image"));
        reader.onerror = () => reject(new Error("Unable to read image"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarData }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAvatarMessage(data.error ?? "We could not save your profile photo.");
        return;
      }
      setProfile((current) => current ? { ...current, avatarData: data.avatarData } : current);
      await update();
      setAvatarMessage("Profile photo saved.");
    } catch {
      setAvatarMessage("We could not save your profile photo. Please try again.");
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f2f3ef] px-4 py-8 text-[#1d2220] sm:py-14">
      <div className="mx-auto w-full max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16] hover:text-[#161818]">← Back to Trade</Link>
          <ProfileMenu username={profile?.username ?? session?.user?.username} avatarData={avatarData} />
        </header>
        <section className="mt-7 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="border-b border-[#dce0da] pb-4 text-2xl font-bold">Profile</h1>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-[#eff1ed] p-5 text-center sm:flex-row sm:text-left">
            <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="Your profile photo" width={96} height={96} unoptimized={Boolean(avatarData)} className="h-24 w-24 rounded-xl bg-white p-2 object-cover" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Avatar</p>
              <p className="mt-1 text-sm leading-5 text-[#5e6863]"><strong>Upload a clear photo, preferably of yourself.</strong> JPG, PNG, or WebP under 1 MB.</p>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" />
              <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="mt-3 rounded-lg bg-[#c6f65c] px-3 py-2 text-xs font-bold text-[#161818]">{avatarSaving ? "Saving..." : avatarData ? "Change image" : "Upload image"}</button>
              {avatarMessage && <p role="status" className="mt-2 text-xs font-medium text-[#4d6c16]">{avatarMessage}</p>}
            </div>
          </div>
          <div className="rounded-xl bg-[#eff1ed] p-5"><p className="font-semibold">FEXEX account</p><p className="mt-2 text-sm leading-6 text-[#5e6863]">Your legal identity and payout details are private and used only for secure trading.</p><div className="mt-4 rounded-lg bg-white p-3 text-sm"><span className="font-semibold">Account status:</span> Verified FEXEX member</div></div>
          </div>
          <div className="mt-7 grid gap-7 lg:grid-cols-2"><div><h2 className="border-b border-[#dce0da] pb-3 text-xl font-bold">Account information</h2><dl className="mt-4 space-y-4">{[["Name",profile?.legalName ?? "Loading..."],["Username",profile?.username ? `@${profile.username}` : "Loading..."],["Email",profile?.email ?? "Loading..."],["Phone number",profile ? phone : "Loading..."],["Date of birth",profile ? dateOfBirth : "Loading..."]].map(([label,value])=><div key={label}><dt className="text-sm text-[#5e6863]">{label}</dt><dd className="mt-1 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">{value}</dd></div>)}</dl></div><div><h2 className="border-b border-[#dce0da] pb-3 text-xl font-bold">Account preferences</h2><div className="mt-4 space-y-4"><div><p className="text-sm text-[#5e6863]">Name display</p><p className="mt-2 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">Your full legal name is private</p></div><div><p className="text-sm text-[#5e6863]">Trading currency</p><p className="mt-2 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">Nigerian Naira (₦)</p></div><div><p className="text-sm text-[#5e6863]">Language</p><p className="mt-2 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">English</p></div></div></div></div>
        </section>
      </div>
    </main>
  );
}
