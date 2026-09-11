"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";

import { ProfileMenu } from "@/components/profile-menu";

interface ProfileData {
  email: string | null;
  username: string | null;
  usernameChangedAt: string | null;
  legalName: string | null;
  dateOfBirth: string | null;
  dateOfBirthChangedAt: string | null;
  avatarData: string | null;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  bio: string | null;
  nameDisplay: "INITIALS" | "FULL_NAME" | "USERNAME";
  preferredCurrency: "USD" | "NGN";
  timezone: string;
}

function toDateDisplayValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getUTCDate().toString().padStart(2, "0")}-${(date.getUTCMonth() + 1).toString().padStart(2, "0")}-${date.getUTCFullYear()}`;
}

function formatDateOfBirth(value: string | null | undefined) {
  return toDateDisplayValue(value) || "Not provided";
}

function formatDateField(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("-");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#5e6863]">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#8a938d]">{hint}</p>}
    </div>
  );
}

const inputClass = "rounded-lg border border-[#e2e6de] bg-[#fafbf9] px-3 py-2.5 font-semibold text-[#1d2220] outline-none transition focus:border-[#00b878] focus:ring-2 focus:ring-[#c6f65c]/40";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [nameDisplay, setNameDisplay] = useState<ProfileData["nameDisplay"]>("USERNAME");
  const [preferredCurrency, setPreferredCurrency] = useState<ProfileData["preferredCurrency"]>("NGN");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  const applyProfile = (data: ProfileData) => {
    setProfile(data);
    setUsername(data.username ?? "");
    setEmail(data.email ?? "");
    setPhoneCountryCode(data.phoneCountryCode ?? "+234");
    setPhoneNumber(data.phoneNumber ?? "");
    setDateOfBirth(toDateDisplayValue(data.dateOfBirth));
    setBio(data.bio ?? "");
    setNameDisplay(data.nameDisplay ?? "USERNAME");
    setPreferredCurrency(data.preferredCurrency ?? "NGN");
    setTimezone(data.timezone ?? "Africa/Lagos");
  };

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
        return response.json() as Promise<ProfileData>;
      })
      .then((data) => { if (active) applyProfile(data); })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof DOMException && error.name === "AbortError"
          ? "Your profile is taking too long to load. Try again."
          : "We could not load your profile. Try again.");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [status, router, loadAttempt]);

  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (!candidate || candidate === profile?.username) { setUsernameMessage(""); return; }
    const timer = window.setTimeout(() => {
      void fetch(`/api/username-availability?username=${encodeURIComponent(candidate)}`)
        .then(async (response) => response.ok ? response.json() : null)
        .then((data) => {
          if (!data) return;
          setUsernameMessage(data.available
            ? "Username is available."
            : data.suggestions?.length
              ? `Taken. Try ${data.suggestions.map((item: string) => `@${item}`).join(", ")}.`
              : "That username is already taken.");
        })
        .catch(() => setUsernameMessage(""));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username, profile?.username]);

  const saveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: true, username, email, phoneCountryCode, phoneNumber, dateOfBirth, bio, nameDisplay, preferredCurrency, timezone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error ?? "We could not save your profile.");
        return;
      }
      applyProfile({ ...profile, ...data } as ProfileData);
      setUsernameMessage("");
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
  const dateOfBirthLocked = Boolean(profile?.dateOfBirth && profile?.dateOfBirthChangedAt);
  const nextUsernameChangeAt = profile?.usernameChangedAt ? new Date(new Date(profile.usernameChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const nextUsernameChangeDate = nextUsernameChangeAt ? toDateDisplayValue(nextUsernameChangeAt.toISOString()) : null;
  const usernameLocked = Boolean(nextUsernameChangeAt && nextUsernameChangeAt.getTime() > Date.now());
  const legalName = profile?.legalName ?? session?.user?.legalName ?? "";
  const loading = status === "authenticated" && !profile && !loadError;
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

        {loadError && (
          <div role="alert" className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{loadError}</span>
            <button type="button" onClick={() => { setLoadError(""); setLoadAttempt((attempt) => attempt + 1); }} className="font-bold underline underline-offset-2">Try again</button>
          </div>
        )}

        {/* Profile header */}
        <section className="fexex-pop-in mt-6 overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/5">
          <div className="h-20 bg-gradient-to-r from-[#c6f65c] to-[#8fe0a8]" />
          <div className="flex flex-col items-center gap-4 px-6 pb-6 sm:flex-row sm:items-end">
            <div className="-mt-12 shrink-0">
              <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="Your profile photo" width={96} height={96} unoptimized={Boolean(avatarData)} className="h-24 w-24 rounded-full border-4 border-white bg-[#eff1ed] object-cover shadow-md" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="truncate text-xl font-bold">{profile?.username ? `@${profile.username}` : legalName || "Your profile"}</h1>
              <p className="truncate text-sm text-[#5e6863]">{legalName || (loading ? "Loading…" : "Legal name not provided")}</p>
            </div>
            <div className="shrink-0">
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" />
              <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="rounded-lg bg-[#eff1ed] px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 hover:shadow-md">
                {avatarSaving ? "Saving..." : avatarData ? "Change photo" : "Upload photo"}
              </button>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className="fexex-pop-in mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
          <h2 className="text-lg font-bold">Bio</h2>
          <textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 180))} placeholder="Tell other traders a little about you" className={`mt-3 h-24 w-full resize-none rounded-lg border border-[#e2e6de] bg-[#fafbf9] p-3 text-sm outline-none transition placeholder:text-[#8a938d] focus:border-[#00b878] focus:ring-2 focus:ring-[#c6f65c]/40`} />
          <p className="mt-1 text-xs text-[#8a938d]">{bio.length}/180 characters</p>
        </section>

        {/* Personal information */}
        <section className="fexex-pop-in mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
          <h2 className="text-lg font-bold">Personal information</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Username" hint={usernameLocked ? `You can change it again after ${nextUsernameChangeDate}.` : "Changeable once every 30 days."}>
              <div className="flex gap-2">
                <input value={username} readOnly={usernameLocked} onChange={(event) => setUsername(event.target.value.replace(/\s/g, "").toLowerCase())} maxLength={24} className={`w-full ${inputClass} read-only:text-[#8a938d]`} />
              </div>
              {usernameMessage && <p className={`mt-1 text-xs ${usernameMessage.includes("available") ? "text-emerald-700" : "text-rose-700"}`}>{usernameMessage}</p>}
            </Field>

            <Field label="Legal name" hint="Cannot be edited here.">
              <div className={`w-full ${inputClass} bg-[#e9ebe6] text-[#5e6863]`}>{legalName || (loading ? "Loading…" : "Not provided")}</div>
            </Field>

            <Field label="Email" hint="Verification will be required when it is introduced.">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={`w-full ${inputClass}`} />
            </Field>

            <Field label="Phone number" hint="10 digits after the country code.">
              <div className="flex gap-2">
                <input value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(`+${event.target.value.replace(/\D/g, "").slice(0, 3)}`)} inputMode="numeric" className={`w-20 shrink-0 ${inputClass}`} />
                <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="8012345678" inputMode="numeric" minLength={10} maxLength={10} className={`min-w-0 flex-1 ${inputClass}`} />
              </div>
            </Field>

            <Field label="Date of birth" hint={dateOfBirthLocked ? "Locked after your first change." : "You can update this once."}>
              {!dateOfBirthLocked ? (
                <input type="text" value={dateOfBirth} onChange={(event) => setDateOfBirth(formatDateField(event.target.value))} inputMode="numeric" maxLength={10} placeholder="DD-MM-YYYY" className={`w-full ${inputClass}`} />
              ) : (
                <div className={`w-full ${inputClass} bg-[#e9ebe6] text-[#5e6863]`}>{formatDateOfBirth(profile?.dateOfBirth)}</div>
              )}
            </Field>

            <Field label="Preferred currency" hint="Your wallet view updates to match.">
              <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value as ProfileData["preferredCurrency"])} className={`w-full ${inputClass}`}>
                <option value="NGN">Nigerian Naira (NGN)</option>
                <option value="USD">US Dollar (USD)</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Display preference */}
        <section className="fexex-pop-in mt-6 rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
          <h2 className="text-lg font-bold">Name shown in trade rooms and receipts</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[["INITIALS", "First name + last initial", initialsExample], ["FULL_NAME", "Full name", fullNameExample], ["USERNAME", "Hide full name", "your username"]].map(([value, label, example]) => (
              <label key={value} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition ${nameDisplay === value ? "border-[#00b878] bg-[#e6f7ef]" : "border-[#e2e6de] hover:border-[#c6d4c1]"}`}>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <input type="radio" name="name-display" value={value} checked={nameDisplay === value} onChange={() => setNameDisplay(value as ProfileData["nameDisplay"])} className="h-4 w-4 accent-[#00b878]" />
                  {label}
                </span>
                <span className="pl-6 text-xs text-[#5e6863]">{example}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-2xl shadow-black/10">
          <p className="min-w-0 truncate text-sm text-[#5e6863]">{message || "Changes save across your whole profile at once."}</p>
          <button type="button" onClick={saveProfile} disabled={saving} className="shrink-0 rounded-xl bg-[#00b878] px-6 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </div>
    </main>
  );
}
