"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  body: string;
  imageData: string | null;
  createdAt: string;
  isOwn: boolean;
  sender: { username: string | null; displayName: string; role: "USER" | "ADMIN" };
};

type Trade = {
  id: string;
  referenceId: string | null;
  giftCardBrand: string | null;
  cryptoAsset: string | null;
  status: string;
  resultDescription: string | null;
};

function playChatTone(kind: "sent" | "received", audioContextRef: React.MutableRefObject<AudioContext | null>) {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const context = audioContextRef.current ?? new window.AudioContext();
  audioContextRef.current = context;
  if (context.state === "suspended") void context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = kind === "sent" ? 680 : 880;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(kind === "sent" ? 0.045 : 0.07, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === "sent" ? 0.1 : 0.16));
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + (kind === "sent" ? 0.11 : 0.17));
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("We could not read this image."));
    reader.onerror = () => reject(new Error("We could not read this image."));
    reader.readAsDataURL(file);
  });
}

export default function TradeRoomPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { status } = useSession();
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sendError, setSendError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const knownMessageIdsRef = useRef<Set<string> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [router, status]);

  useEffect(() => {
    if (!orderId || status !== "authenticated") return;
    let active = true;
    let loadInFlight = false;
    const load = () => {
      if (document.visibilityState !== "visible" || loadInFlight) return;
      loadInFlight = true;
      void fetch(`/api/trades/${orderId}/messages`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "We could not load this trade room.");
          return data as { order: Trade; messages: Message[] };
        })
        .then((data) => {
          if (!active) return;
          setTrade(data.order);
          setMessages(data.messages);
          setLoadError("");
        })
        .catch((error: unknown) => {
          if (active) setLoadError(error instanceof Error ? error.message : "We could not load this trade room.");
        })
        .finally(() => { loadInFlight = false; });
    };
    load();
    const timer = window.setInterval(load, 10_000);
    document.addEventListener("visibilitychange", load);
    return () => { active = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", load); };
  }, [orderId, status]);

  useEffect(() => {
    const latestMessageId = messages.at(-1)?.id;
    const messageList = messageListRef.current;
    if (!latestMessageId || !messageList || latestMessageId === latestMessageIdRef.current) return;
    const isInitialLoad = latestMessageIdRef.current === null;
    const isNearBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 96;
    if (isInitialLoad || isNearBottom) {
      messageList.scrollTo({ top: messageList.scrollHeight, behavior: isInitialLoad ? "auto" : "smooth" });
    }
    latestMessageIdRef.current = latestMessageId;
  }, [messages]);

  useEffect(() => {
    const currentMessageIds = new Set(messages.map((message) => message.id));
    if (knownMessageIdsRef.current) {
      const hasIncomingMessage = messages.some((message) => !knownMessageIdsRef.current!.has(message.id) && !message.isOwn);
      if (hasIncomingMessage) playChatTone("received", audioContextRef);
    }
    knownMessageIdsRef.current = currentMessageIds;
  }, [messages]);

  useEffect(() => () => { void audioContextRef.current?.close(); }, []);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!/^image\/(jpeg|png|webp)$/.test(selected.type) || selected.size > 2 * 1024 * 1024) {
      setSendError("Choose a JPG, PNG, or WebP image under 2 MB.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(selected);
    setImagePreview(URL.createObjectURL(selected));
    setSendError("");
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview("");
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = body.trim();
    if ((!message && !image) || sending || trade?.status === "COMPLETED") return;
    setSending(true);
    setSendError("");
    try {
      const imageData = image ? await readImage(image) : undefined;
      const response = await fetch(`/api/trades/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message, imageData }),
      });
      const saved = await response.json().catch(() => null);
      if (!response.ok) throw new Error(saved?.error ?? "We could not send your message.");
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setBody("");
      removeImage();
      playChatTone("sent", audioContextRef);
    } catch (error: unknown) {
      setSendError(error instanceof Error ? error.message : "We could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const copySessionId = async () => {
    if (!trade?.referenceId || !navigator.clipboard) return;
    await navigator.clipboard.writeText(trade.referenceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  };

  const isClosed = trade?.status === "COMPLETED";
  const tradeName = trade?.giftCardBrand ?? trade?.cryptoAsset ?? "Trade";

  return (
    <main className="fexex-surface min-h-screen bg-[#161818] p-4 text-[#f4f3ee] sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/trade" className="text-sm font-semibold text-[#c6f65c] transition hover:text-[#d8ff96]">← Back to Trade</Link>
        <section className="mt-5 overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] shadow-2xl shadow-black/20">
          <div className="border-b border-[#f4f3ee]/10 bg-gradient-to-r from-[#202b20] via-[#202323] to-[#26222e] p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${isClosed ? "bg-[#a9afa9]" : "bg-[#c6f65c] shadow-[0_0_12px_#c6f65c]"}`} /><p className="text-xs font-bold tracking-[.16em] text-[#c6f65c]">FEXEX TRADE SUPPORT</p></div>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{tradeName} trade room</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[#c9cec8]">{isClosed ? "This successful trade is complete and the conversation is now closed." : "Message the other party here. New replies appear automatically every few seconds."}</p>
              </div>
              {trade?.referenceId && <div className="rounded-2xl border border-[#c6f65c]/30 bg-[#151817]/50 px-4 py-3"><p className="text-[10px] font-bold tracking-[.13em] text-[#a9afa9]">TRADE SESSION ID</p><button type="button" onClick={() => void copySessionId()} className="mt-1 block max-w-52 truncate font-mono text-xs font-bold text-[#d8ff96] transition hover:text-white" title="Copy Trade Session ID">{copied ? "Copied" : trade.referenceId}</button><Link href={`/trade/${orderId}/receipt`} className="mt-2 inline-block text-xs font-semibold text-[#d6c7ff] hover:text-white">View receipt →</Link></div>}
            </div>
          </div>

          {trade?.status === "COMPLETED" && <p className="m-5 rounded-2xl border border-[#c6f65c]/30 bg-[#c6f65c]/10 px-4 py-3 text-sm font-semibold text-[#d8ff96]">Successful trade. No further action is needed.</p>}
          {trade?.status === "REJECTED" && <div className="m-5 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"><p className="font-bold">Trade failed</p><p className="mt-1">{trade.resultDescription ?? "Please contact support with your Trade Session ID."}</p></div>}

          <div className="px-5 pb-5 sm:px-7 sm:pb-7">
            <div ref={messageListRef} className="mt-5 max-h-[460px] min-h-72 space-y-4 overflow-y-auto rounded-2xl border border-[#f4f3ee]/5 bg-[#171a1a] p-4 sm:p-5" aria-live="polite">
              {messages.length ? messages.map((message) => {
                const isAdmin = message.sender.role === "ADMIN";
                // Align each bubble from this viewer's own perspective: messages this
                // user sent appear on the right, everything else on the left.
                return (
                  <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.isOwn ? "rounded-br-md bg-[#c6f65c] text-[#161818]" : isAdmin ? "rounded-bl-md bg-[#d6c7ff] text-[#161818]" : "rounded-bl-md bg-[#2a2e2d] text-[#f4f3ee]"}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-4"><p className="text-xs font-bold">{message.isOwn ? "You" : isAdmin ? "FEXEX Admin" : message.sender.displayName}</p><time dateTime={message.createdAt} className={`shrink-0 text-[10px] font-medium ${message.isOwn || isAdmin ? "text-[#161818]/60" : "text-[#a9afa9]"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>
                      {message.imageData && <img src={message.imageData} alt={`${message.sender.displayName} attached an image`} className="mb-2 max-h-72 w-full rounded-xl object-cover" />}
                      {message.body && <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>}
                    </div>
                  </div>
                );
              }) : <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center"><span className="mb-3 rounded-full bg-[#c6f65c]/10 px-3 py-1 text-xs font-bold text-[#d8ff96]">SECURE TRADE CHAT</span><p className="text-sm font-semibold text-[#f4f3ee]">This trade room is ready.</p><p className="mt-1 max-w-sm text-sm leading-6 text-[#a9afa9]">Ask a question or share any detail the reviewer needs. Never post your password, bank PIN, or recovery phrase here.</p></div>}
            </div>

            {loadError && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{loadError}</p>}
            {sendError && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{sendError}</p>}

            <form onSubmit={send} className="mt-4">
              {imagePreview && <div className="mb-3 inline-flex items-start gap-3 rounded-2xl border border-[#f4f3ee]/10 bg-[#1a1d1d] p-2"><img src={imagePreview} alt="Selected message attachment" className="h-16 w-16 rounded-xl object-cover" /><div className="pr-1"><p className="text-xs font-semibold">Image ready</p><button type="button" onClick={removeImage} className="mt-2 text-xs font-bold text-red-200 hover:text-white">Remove</button></div></div>}
              <div className="flex gap-2">
                <label className={`flex shrink-0 cursor-pointer items-center justify-center self-end rounded-2xl border border-[#f4f3ee]/20 px-4 py-3 text-sm font-bold text-[#d7dbd4] transition hover:border-[#c6f65c] hover:text-[#d8ff96] ${isClosed || sending ? "pointer-events-none opacity-50" : ""}`} title="Attach an image"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} disabled={isClosed || sending} className="sr-only" />Image</label>
                <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={2} disabled={isClosed || sending} placeholder={isClosed ? "This trade room is closed" : "Write a message about this trade"} className="min-w-0 flex-1 resize-none rounded-2xl border border-[#f4f3ee]/15 bg-[#f4f3ee] px-4 py-3 text-sm text-[#161818] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/30 disabled:cursor-not-allowed disabled:opacity-60" />
                <button type="submit" disabled={(!body.trim() && !image) || isClosed || sending} className="self-end rounded-2xl bg-[#c6f65c] px-5 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#777a75]"><span>{isClosed ? "Conversation closed after successful trade" : "Images: JPG, PNG, or WebP up to 2 MB."}</span><span>{body.length}/1000</span></div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
