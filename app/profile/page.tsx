"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ProfileMenu } from "@/components/profile-menu";

interface PublicProfileData {
  email: string | null;
  username: string | null;
  legalName: string | null;
  avatarData: string | null;
  bio: string | null;
  nameDisplay: "INITIALS" | "FULL_NAME" | "USERNAME";
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [bio, setBio] = useState("");
  const [nameDisplay, setNameDisplay] = useState<PublicProfileData["nameDisplay"]>("USERNAME");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status !== "authenticated") return;

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);

    void fetch("/api/user/profile?scope=account", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile request failed");
        return response.json() as Promise<PublicProfileData>;
      })
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setBio(data.bio ?? "");
        setNameDisplay(data.nameDisplay ?? "USERNAME");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof DOMException && error.name === "AbortError"
          ? "Your profile is taking too long to load. Try again."
          : "We could not load your profile. Try again.");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [status, router, loadAttempt]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: true, bio, nameDisplay }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not save your profile.");
        return;
      }
      setProfile((current) => current ? { ...current, bio: data.bio, nameDisplay: data.nameDisplay } : current);
      setMessage("Profile saved.");
      await update();
    } catch {
      setMessage("A network error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 1_000_000) {
      setMessage("Choose a JPG, PNG, or WebP image under 1 MB.");
      return;
    }

    setAvatarSaving(true);
    setMessage("");
    try {
      const avatarData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not save your photo.");
        return;
      }
      setProfile((current) => current ? { ...current, avatarData: data.avatarData } : current);
      await update();
      setMessage("Profile photo saved.");
    } catch {
      setMessage("We could not save your photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const avatarData = profile?.avatarData ?? session?.user?.avatarData;
  const legalName = profile?.legalName ?? session?.user?.legalName ?? "";
  const legalNameParts = (legalName || "Your name").trim().split(/\s+/);
  const initialsExample = `${legalNameParts[0]}${legalNameParts.length > 1 ? ` ${legalNameParts.at(-1)?.[0]}.` : ""}`;
  const fullNameExample = legalName || "Your full name";

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={profile?.username ?? session?.user?.username} avatarData={avatarData} />
        </header>

        <section className="fexex-pop-in mt-7 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <div className="flex items-center justify-between border-b border-[#dce0da] pb-4">
            <h1 className="text-2xl font-bold">Profile</h1>
            <Link href="/settings" className="text-sm font-semibold text-[#4d6c16] hover:underline">Account settings →</Link>
          </div>
          <p className="mt-1 text-sm text-[#5e6863]">How you appear to others in trade rooms and support</p>

          {loadError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{loadError}</span>
              <button type="button" onClick={() => { setLoadError(""); setLoadAttempt((attempt) => attempt + 1); }} className="font-bold underline underline-offset-2">Try again</button>
            </div>
          )}

          <div className="mt-5 flex flex-col items-center gap-4 rounded-xl bg-[#eff1ed] p-4 text-center sm:flex-row sm:text-left">
            <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="Your profile photo" width={96} height={96} unoptimized={Boolean(avatarData)} className="h-24 w-24 rounded-xl bg-white p-2 object-cover transition hover:scale-105" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{profile?.username ? `@${profile.username}` : legalName || "Your profile"}</p>
              <p className="mt-1 text-sm leading-5 text-[#5e6863]"><strong>Upload a clear photo, preferably of yourself.</strong> JPG, PNG, or WebP under 1 MB.</p>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" />
              <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md">
                {avatarSaving ? "Saving..." : avatarData ? "Change image" : "Upload image"}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-sm text-[#5e6863]">Brief bio</label>
            <textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 180))} placeholder="Your bio will appear on your public profile" className="h-28 w-full resize-none rounded-xl bg-[#eff1ed] p-3 text-sm outline-none placeholder:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
            <p className="mt-1 text-xs text-[#5e6863]">Maximum 180 characters · {bio.length}/180</p>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm text-[#5e6863]">Name shown on trade rooms and receipts</legend>
            <div className="mt-2 space-y-2">
              {[["INITIALS", "Show first name and last name initial"], ["FULL_NAME", "Show full name"], ["USERNAME", "Hide full name"]].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="name-display" value={value} checked={nameDisplay === value} onChange={() => setNameDisplay(value as PublicProfileData["nameDisplay"])} className="h-4 w-4 accent-[#00b878]" />
                  {label}<span className="text-[#5e6863]">{value === "INITIALS" ? `(${initialsExample})` : value === "FULL_NAME" ? `(${fullNameExample})` : "(your username)"}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" onClick={save} disabled={saving} className="mt-6 w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 sm:w-auto">{saving ? "Saving..." : "Save profile"}</button>

          {message && <p role="status" className="mt-5 rounded-xl bg-[#eff1ed] px-4 py-3 text-sm font-medium text-[#4d6c16]">{message}</p>}
        </section>
      </div>
    </main>
  );
}
