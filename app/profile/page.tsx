"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { ProfileMenu } from "@/components/profile-menu";
import { SettingsSidebar } from "@/components/settings-sidebar";

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

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoadError, setProfileLoadError] = useState("");
  const [profileLoadAttempt, setProfileLoadAttempt] = useState(0);
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
      .then((data) => {
        if (active) applyProfile(data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfileLoadError(error instanceof DOMException && error.name === "AbortError"
          ? "Your profile is taking too long to load. Try again."
          : "We could not load your profile. Try again.");
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [status, router, profileLoadAttempt]);

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
      setUsernameMessage("");
      setMessage("Saved.");
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
  const accountDetailsLoading = status === "authenticated" && !profile && !profileLoadError;

  return (
    <main className="min-h-screen bg-[#f2f3ef] p-4 text-[#1d2220] sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/trade" className="text-sm font-semibold text-[#4d6c16]">← Back to Trade</Link>
          <ProfileMenu username={profile?.username ?? session?.user?.username} avatarData={avatarData} />
        </header>

        {profileLoadError && (
          <div role="alert" className="mt-5 flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{profileLoadError}</span>
            <button type="button" onClick={() => { setProfileLoadError(""); setProfileLoadAttempt((attempt) => attempt + 1); }} className="font-bold underline underline-offset-2">Try again</button>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
          <SettingsSidebar />

          <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              {/* Phone number */}
              <section className="fexex-pop-in rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
                <h2 className="flex items-center gap-2 text-lg font-bold"><span className="h-4 w-1 rounded-full bg-[#00b878]" />Phone number</h2>

                {!phoneNumber && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fdf3d8] p-4 text-sm text-[#7a5b0a]">
                    <span aria-hidden="true" className="mt-0.5">⚠</span>
                    <p>Add a phone number so support can reach you about your trades. Verification codes are not required yet.</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <input value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(`+${event.target.value.replace(/\D/g, "").slice(0, 3)}`)} inputMode="numeric" className="w-20 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                  <input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Please enter" inputMode="numeric" minLength={10} maxLength={10} className="min-w-0 flex-1 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none placeholder:font-normal placeholder:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
                </div>
                <p className="mt-1 text-xs text-[#5e6863]">Enter exactly 10 digits after the country code.</p>

                <button type="button" onClick={saveProfile} disabled={saving} className="mt-4 w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60 sm:w-auto">{saving ? "Saving..." : "Save"}</button>
              </section>

              {/* Message / basic details */}
              <section className="fexex-pop-in rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
                <h2 className="flex items-center gap-2 text-lg font-bold"><span className="h-4 w-1 rounded-full bg-[#00b878]" />Message</h2>

                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#5e6863]">Name</label>
                    <div className="flex gap-2">
                      <input value={username} readOnly={usernameLocked} onChange={(event) => setUsername(event.target.value.replace(/\s/g, "").toLowerCase())} maxLength={24} className="min-w-0 flex-1 rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none read-only:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
                      <button type="button" onClick={saveProfile} disabled={saving || usernameLocked || !username} className="shrink-0 rounded-lg bg-[#00b878] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50">Confirm</button>
                    </div>
                    {usernameMessage && <p className={`mt-1 text-xs ${usernameMessage.includes("available") ? "text-emerald-700" : "text-rose-700"}`}>{usernameMessage}</p>}
                    <p className="mt-1 text-xs text-[#00b878]">{usernameLocked ? `Your name is your unique identification — you can change it again after ${nextUsernameChangeDate}.` : "Your name is your unique identification and can only be changed once every 30 days."}</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#5e6863]">Preferred currency</label>
                    <select value={preferredCurrency} onChange={(event) => setPreferredCurrency(event.target.value as ProfileData["preferredCurrency"])} className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]">
                      <option value="NGN">Nigerian Naira (NGN)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                    <p className="mt-1 text-xs text-[#5e6863]">Your wallet view updates to this display currency.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="mb-1 block text-sm text-[#5e6863]">Brief Bio</label>
                  <textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 180))} placeholder="Brief will display on your user center" className="h-28 w-full resize-none rounded-xl bg-[#eff1ed] p-3 text-sm outline-none placeholder:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
                  <p className="mt-1 text-xs text-[#5e6863]">180 characters at most · {bio.length}/180</p>
                </div>

                <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
              </section>

              {/* Additional account details kept from the previous layout */}
              <section className="fexex-pop-in rounded-2xl bg-white p-6 shadow-xl shadow-black/5">
                <h2 className="flex items-center gap-2 text-lg font-bold"><span className="h-4 w-1 rounded-full bg-[#00b878]" />Additional details</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-[#5e6863]">Legal name</label>
                    <div className="rounded-lg bg-[#e0e0e0] px-3 py-2.5 font-semibold">{legalName || (accountDetailsLoading ? "Loading…" : "Not provided")}</div>
                    <p className="mt-1 text-xs text-[#5e6863]">Your legal name cannot be edited here.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#5e6863]">Email</label>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none focus:ring-2 focus:ring-[#c6f65c]" />
                    <p className="mt-1 text-xs text-[#5e6863]">Email verification will be required when it is introduced.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#5e6863]">Date of birth</label>
                    {!dateOfBirthLocked ? (
                      <input type="text" value={dateOfBirth} onChange={(event) => setDateOfBirth(formatDateField(event.target.value))} inputMode="numeric" maxLength={10} placeholder="DD-MM-YYYY" className="w-full rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold outline-none placeholder:font-normal placeholder:text-[#7e8782] focus:ring-2 focus:ring-[#c6f65c]" />
                    ) : (
                      <div className="rounded-lg bg-[#eff1ed] px-3 py-2.5 font-semibold">{formatDateOfBirth(profile?.dateOfBirth)}</div>
                    )}
                    <p className="mt-1 text-xs text-[#5e6863]">{dateOfBirthLocked ? "Locked after your first change." : "You can update this date once."}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm text-[#5e6863]">Name shown on trade rooms and receipts</label>
                    <div className="flex flex-wrap gap-4">
                      {[["INITIALS", "First name + last initial"], ["FULL_NAME", "Full name"], ["USERNAME", "Hide full name"]].map(([value, label]) => (
                        <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input type="radio" name="name-display" value={value} checked={nameDisplay === value} onChange={() => setNameDisplay(value as ProfileData["nameDisplay"])} className="h-4 w-4 accent-[#00b878]" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={saveProfile} disabled={saving} className="mt-5 w-full rounded-xl bg-[#00b878] px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg disabled:translate-y-0 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
              </section>

              {message && <p role="status" className="rounded-xl bg-[#eff1ed] px-4 py-3 text-sm font-medium text-[#4d6c16]">{message}</p>}
            </div>

            {/* Profile card */}
            <div>
              <section className="fexex-pop-in rounded-2xl bg-white p-6 text-center shadow-xl shadow-black/5">
                <h2 className="flex items-center gap-2 text-left text-lg font-bold"><span className="h-4 w-1 rounded-full bg-[#00b878]" />Profile</h2>
                <Image src={avatarData || "/fexex-profile-avatar.svg"} alt="Your profile photo" width={96} height={96} unoptimized={Boolean(avatarData)} className="mx-auto mt-5 h-24 w-24 rounded-full bg-[#eff1ed] object-cover" />
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={changeAvatar} className="sr-only" />
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="mt-3 rounded-lg bg-[#eff1ed] px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md">
                  {avatarSaving ? "Saving..." : avatarData ? "Change photo" : "Upload photo"}
                </button>
                <p className="mt-4 text-base font-bold">{profile?.username ? `@${profile.username}` : legalName || "—"}</p>
                <p className="mt-1 truncate text-sm text-[#5e6863]">{email || "No email on file"}</p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
