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

const TIMEZONES = [
  "Africa/Lagos", "Africa/Accra", "Africa/Cairo", "Africa/Johannesburg", "Europe/London", "Europe/Paris",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney",
];

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm text-[#5e6863]">{children}</label>;
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

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+234");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bio, setBio] = useState("");
  const [nameDisplay, setNameDisplay] = useState<ProfileData["nameDisplay"]>("USERNAME");
  const [preferredCurrency, setPreferredCurrency] = useState<ProfileData["preferredCurrency"]>("NGN");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [accountEditing, setAccountEditing] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
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

    void fetch("/api/user/profile")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (data) applyProfile(data); })
      .catch(() => setMessage("We could not load your profile."));
  }, [status, router]);

  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (!accountEditing || !candidate || candidate === profile?.username) return;
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
  }, [accountEditing, username, profile?.username]);

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

      setProfile((current) => current ? { ...current, ...data } : current);
      setUsername(data.username);
      setEmail(data.email);
      setPhoneCountryCode(data.phoneCountryCode);
      setPhoneNumber(data.phoneNumber);
      setDateOfBirth(toDateDisplayValue(data.dateOfBirth));
      setBio(data.bio);
      setNameDisplay(data.nameDisplay);
      setPreferredCurrency(data.preferredCurrency);
      setTimezone(data.timezone);
      setAccountEditing(false);
      setBioEditing(false);
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

  const toggleAccountEditing = () => {
    if (accountEditing && profile) applyProfile(profile);
    setAccountEditing((value) => !value);
    setUsernameMessage("");
  };

  const avatarData = profile?.avatarData ?? session?.user?.avatarData;
  const dateOfBirthLocked = Boolean(profile?.dateOfBirth && profile?.dateOfBirthChangedAt);
  const legalNameParts = (profile?.legalName ?? "Your name").trim().split(/\s+/);
  const initialsExample = `${legalNameParts[0]}${legalNameParts.length > 1 ? ` ${legalNameParts.at(-1)?.[0]}.` : ""}`;
  const fullNameExample = profile?.legalName ?? "Your full name";

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={profile?.username ?? session?.user?.username} avatarData={avatarData} />
        </header>

        <section className="mt-7 rounded-2xl bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
          <h1 className="border-b border-[#dce0da] pb-4 text-2xl font-bold">Profile</h1>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col items-center gap-4 rounded-xl bg-[#eff1ed] p-4 text-center sm:flex-row sm:text-left">
              <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="Your profile photo" width={96} height={96} unoptimized={Boolean(avatarData)} className="h-24 w-24 rounded-xl bg-white p-2 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Avatar</p>
                <p className="mt-1 text-sm leading-5 text-[#5e6863]"><strong>Upload a clear photo, preferably of yourself.</strong> JPG, PNG, or WebP under 1 MB.</p>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" />
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold">
                  {avatarSaving ? "Saving..." : avatarData ? "Change image" : "Upload image"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-[#eff1ed] p-4">
              <textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 180))} readOnly={!bioEditing} placeholder="Your bio will appear on your public profile" className={`h-28 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none ${bioEditing ? "ring-2 ring-[#c6f65c]" : "text-[#5e6863]"}`} />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-[#5e6863]">Maximum 180 characters · {bio.length}/180</p>
                {bioEditing ? <button type="button" onClick={saveProfile} disabled={saving} className="rounded-lg bg-[#c6f65c] px-3 py-2 text-xs font-bold text-[#161818]">{saving ? "Saving..." : "Save"}</button> : <button type="button" onClick={() => setBioEditing(true)} className="rounded-lg bg-[#00b878] px-3 py-2 text-xs font-bold text-white">Edit</button>}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-7 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between border-b border-[#dce0da] pb-3">
                <h2 className="text-xl font-bold">Account information</h2>
                <button type="button" onClick={toggleAccountEditing} className="rounded-lg bg-[#eff1ed] px-3 py-2 text-xs font-bold">{accountEditing ? "Cancel" : "Edit"}</button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <FieldLabel>Name</FieldLabel>
                  <div className="rounded-lg bg-[#e0e0e0] px-3 py-2.5 font-semibold">{profile?.legalName ?? "Loading..."}</div>
                  <p className="mt-1 text-xs text-[#5e6863]">Your legal name cannot be edited here.</p>
                </div>
                <div>
                  <FieldLabel>Username</FieldLabel>
                  <input value={username} readOnly={!accountEditing} onChange={(event) => { setUsername(event.target.value.replace(/\s/g, "").toLowerCase()); setUsernameMessage(""); }} maxLength={24} className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none read-only:text-[#1d2220] focus:ring-2 focus:ring-[#c6f65c]" />
                  {usernameMessage && <p className={`mt-1 text-xs ${usernameMessage.includes("available") ? "text-emerald-700" : "text-rose-700"}`}>{usernameMessage}</p>}
                </div>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input type="email" value={email} readOnly={!accountEditing} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                  <p className="mt-1 text-xs text-[#5e6863]">Email verification will be required when it is introduced.</p>
                </div>
                <div>
                  <FieldLabel>Phone number</FieldLabel>
                  <div className="flex gap-2">
                    <input value={phoneCountryCode} readOnly={!accountEditing} onChange={(event) => setPhoneCountryCode(`+${event.target.value.replace(/\D/g, "").slice(0, 3)}`)} inputMode="numeric" className="w-20 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                    <input value={phoneNumber} readOnly={!accountEditing} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" minLength={10} maxLength={10} className="min-w-0 flex-1 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                  </div>
                  <p className="mt-1 text-xs text-[#5e6863]">Enter exactly 10 digits after the country code.</p>
                </div>
                <div>
                  <FieldLabel>Date of birth</FieldLabel>
                  {!dateOfBirthLocked ? (
                    <input type="text" value={dateOfBirth} onChange={(event) => setDateOfBirth(formatDateField(event.target.value))} inputMode="numeric" maxLength={10} placeholder="DD-MM-YYYY" className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none placeholder:font-normal placeholder:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
                  ) : (
                    <div className="rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">{formatDateOfBirth(profile?.dateOfBirth)}</div>
                  )}
                  <p className="mt-1 text-xs text-[#5e6863]">{dateOfBirthLocked ? "Your date of birth has already been changed once and is locked." : "Use DD-MM-YYYY, for example 29-08-1995. You can update this date once."}</p>
                  {!dateOfBirthLocked && !accountEditing && <button type="button" onClick={saveProfile} disabled={saving || !dateOfBirth} className="mt-2 rounded-lg bg-[#00b878] px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save date of birth"}</button>}
                </div>
                {accountEditing && <button type="button" onClick={saveProfile} disabled={saving} className="w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white disabled:opacity-60">{saving ? "Saving account..." : "Save account changes"}</button>}
              </div>
            </div>

            <div>
              <h2 className="border-b border-[#dce0da] pb-3 text-xl font-bold">Account preferences</h2>
              <div className="mt-4 space-y-5">
                <fieldset>
                  <legend className="text-sm text-[#5e6863]">Name display</legend>
                  <div className="mt-2 space-y-2">
                    {[["INITIALS", "Show first name and last name initial"], ["FULL_NAME", "Show full name"], ["USERNAME", "Hide full name"]].map(([value, label]) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="name-display" value={value} checked={nameDisplay === value} onChange={() => setNameDisplay(value as ProfileData["nameDisplay"])} className="h-4 w-4 accent-[#00b878]" />
                        {label}<span className="text-[#5e6863]">{value === "INITIALS" ? `(${initialsExample})` : value === "FULL_NAME" ? `(${fullNameExample})` : "(your username)"}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <FieldLabel>Preferred currency</FieldLabel>
                  <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value as ProfileData["preferredCurrency"])} className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]">
                    <option value="NGN">🇳🇬 Nigerian Naira (NGN)</option>
                    <option value="USD">🇺🇸 US Dollar (USD)</option>
                  </select>
                  <p className="mt-1 text-xs text-[#5e6863]">Your wallet view updates to this display currency.</p>
                </div>
                <div>
                  <FieldLabel>Timezone</FieldLabel>
                  <input value={timezone} onChange={(event) => setTimezone(event.target.value)} list="fexex-timezones" className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                  <datalist id="fexex-timezones">{TIMEZONES.map((item) => <option key={item} value={item} />)}</datalist>
                  <p className="mt-1 text-xs text-[#5e6863]">Default: West Africa Time, Nigeria (Africa/Lagos).</p>
                </div>
                <button type="button" onClick={saveProfile} disabled={saving} className="w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white disabled:opacity-60">{saving ? "Saving profile..." : "Save profile preferences"}</button>
              </div>
            </div>
          </div>

          {message && <p role="status" className="mt-5 rounded-xl bg-[#eff1ed] px-4 py-3 text-sm font-medium text-[#4d6c16]">{message}</p>}
        </section>
      </div>
    </main>
  );
}
