"use client";
/* eslint-disable @next/next/no-img-element */

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

interface TicketSummary {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  updatedAt: string;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
}

interface TicketMessage {
  id: string;
  body: string;
  imageData: string | null;
  createdAt: string;
  isOwn: boolean;
  sender: { displayName: string; role: "USER" | "ADMIN" };
}

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("We could not read this image."));
    reader.onerror = () => reject(new Error("We could not read this image."));
    reader.readAsDataURL(file);
  });
}

export function SupportWidget() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "new" | "thread">("list");
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    if (open) window.addEventListener("pointerdown", closeOnOutsidePress);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  const loadTickets = () => {
    setTicketsLoading(true);
    void fetch("/api/support/tickets", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("We could not load your tickets.");
        return response.json() as Promise<TicketSummary[]>;
      })
      .then(setTickets)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "We could not load your tickets."))
      .finally(() => setTicketsLoading(false));
  };

  useEffect(() => {
    if (!open || status !== "authenticated") return;
    void fetch("/api/support/tickets", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("We could not load your tickets.");
        return response.json() as Promise<TicketSummary[]>;
      })
      .then(setTickets)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "We could not load your tickets."))
      .finally(() => setTicketsLoading(false));
  }, [open, status]);

  useEffect(() => {
    if (view !== "thread" || !selectedTicketId) return;
    let active = true;
    let inFlight = false;
    const load = () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      void fetch(`/api/support/tickets/${selectedTicketId}/messages`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "We could not load this ticket.");
          return data as { messages: TicketMessage[] };
        })
        .then((data) => { if (active) setMessages(data.messages); })
        .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "We could not load this ticket."); })
        .finally(() => { inFlight = false; });
    };
    load();
    const timer = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [view, selectedTicketId]);

  useEffect(() => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight });
  }, [messages]);

  if (status !== "authenticated" || session?.user?.role === "ADMIN" || pathname?.startsWith("/admin")) return null;

  const openTicket = (id: string) => {
    setSelectedTicketId(id);
    setMessages([]);
    setError("");
    setView("thread");
  };

  const submitNewTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (!trimmedSubject || (!trimmedBody && !image) || sending) return;
    setSending(true);
    setError("");
    try {
      const imageData = image ? await readImage(image) : undefined;
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: trimmedSubject, body: trimmedBody, imageData }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "We could not open your ticket.");
      setSubject("");
      setBody("");
      setImage(null);
      loadTickets();
      openTicket(data.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We could not open your ticket.");
    } finally {
      setSending(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = body.trim();
    if (!message || !selectedTicketId || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const saved = await response.json().catch(() => null);
      if (!response.ok) throw new Error(saved?.error ?? "We could not send your message.");
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setBody("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "We could not send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div ref={panelRef} className="mb-3 flex h-[520px] w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] text-[#f4f3ee] shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-2 border-b border-[#f4f3ee]/10 bg-[#1a1d1d] px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              {view !== "list" && (
                <button type="button" onClick={() => { setView("list"); setError(""); }} className="shrink-0 text-sm font-bold text-[#c6f65c]">←</button>
              )}
              <p className="truncate text-sm font-bold">{view === "list" ? "Support" : view === "new" ? "New ticket" : selectedTicket?.subject ?? "Ticket"}</p>
            </div>
            {view === "list" && <button type="button" onClick={() => setView("new")} className="shrink-0 rounded-lg bg-[#c6f65c] px-2.5 py-1.5 text-xs font-bold text-[#161818]">New</button>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === "list" && (
              ticketsLoading ? (
                <p className="p-5 text-center text-sm text-[#a9afa9]">Loading your tickets…</p>
              ) : tickets.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm font-semibold">No support tickets yet</p>
                  <p className="text-xs text-[#a9afa9]">Have a question or an issue? Open a ticket and we&apos;ll reply here.</p>
                  <button type="button" onClick={() => setView("new")} className="mt-2 rounded-xl bg-[#c6f65c] px-4 py-2 text-xs font-bold text-[#161818]">Open a ticket</button>
                </div>
              ) : (
                <div className="p-2">
                  {tickets.map((ticket) => (
                    <button key={ticket.id} type="button" onClick={() => openTicket(ticket.id)} className="mb-1 w-full rounded-2xl p-3 text-left text-[#d7dbd4] transition hover:bg-[#2a302d]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-bold text-[#f4f3ee]">{ticket.subject}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ticket.status === "OPEN" ? "bg-[#c6f65c]/15 text-[#d8ff96]" : "bg-[#f4f3ee]/10 text-[#a9afa9]"}`}>{ticket.status}</span>
                      </div>
                      {ticket.lastMessage && <p className="mt-1 truncate text-xs text-[#a9afa9]">{ticket.lastMessage.body || "Sent an image"}</p>}
                    </button>
                  ))}
                </div>
              )
            )}

            {view === "new" && (
              <form onSubmit={submitNewTicket} className="flex h-full flex-col gap-3 p-4">
                <div>
                  <label htmlFor="support-subject" className="mb-1 block text-xs font-semibold text-[#d7dbd4]">Subject</label>
                  <input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} placeholder="What's this about?" className="w-full rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-2.5 text-sm outline-none placeholder:text-[#777a75] focus:border-[#c6f65c]" />
                </div>
                <div className="flex-1">
                  <label htmlFor="support-body" className="mb-1 block text-xs font-semibold text-[#d7dbd4]">Message</label>
                  <textarea id="support-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={5} placeholder="Describe your issue or question" className="w-full resize-none rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-2.5 text-sm outline-none placeholder:text-[#777a75] focus:border-[#c6f65c]" />
                </div>
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#f4f3ee]/20 px-3 py-2 text-xs font-semibold text-[#d7dbd4] hover:border-[#c6f65c]">
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} className="sr-only" />
                  {image ? "Image attached" : "Attach an image (optional)"}
                </label>
                {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
                <button type="submit" disabled={sending || !subject.trim() || (!body.trim() && !image)} className="rounded-xl bg-[#c6f65c] px-4 py-2.5 text-sm font-bold text-[#161818] disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
              </form>
            )}

            {view === "thread" && (
              <div className="flex h-full flex-col">
                <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length ? messages.map((message) => {
                    const isAdmin = message.sender.role === "ADMIN";
                    return (
                      <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.isOwn ? "rounded-br-md bg-[#c6f65c] text-[#161818]" : isAdmin ? "rounded-bl-md bg-[#d6c7ff] text-[#161818]" : "rounded-bl-md bg-[#2a2e2d] text-[#f4f3ee]"}`}>
                          <p className="mb-1 text-[10px] font-bold">{message.isOwn ? "You" : isAdmin ? "FEXEX Admin" : message.sender.displayName}</p>
                          {message.imageData && <img src={message.imageData} alt="Attachment" className="mb-1.5 max-h-40 w-full rounded-lg object-cover" />}
                          {message.body && <p className="whitespace-pre-wrap break-words leading-5">{message.body}</p>}
                        </div>
                      </div>
                    );
                  }) : <p className="p-4 text-center text-sm text-[#a9afa9]">Loading conversation…</p>}
                </div>
                {error && <p role="alert" className="px-4 pb-1 text-xs text-red-300">{error}</p>}
                <form onSubmit={sendReply} className="flex gap-2 border-t border-[#f4f3ee]/10 p-3">
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={1} placeholder="Write a message" className="min-w-0 flex-1 resize-none rounded-xl border border-[#f4f3ee]/15 bg-[#1a1d1d] px-3 py-2 text-sm outline-none placeholder:text-[#777a75] focus:border-[#c6f65c]" />
                  <button type="submit" disabled={!body.trim() || sending} className="shrink-0 rounded-xl bg-[#c6f65c] px-3 py-2 text-xs font-bold text-[#161818] disabled:opacity-50">{sending ? "…" : "Send"}</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => { setOpen((value) => !value); setError(""); }}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#c6f65c] text-[#161818] shadow-2xl shadow-black/30 transition hover:bg-[#d9ff86]"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.4-5.7A8.38 8.38 0 0 1 3.5 12a8.5 8.5 0 0 1 4.7-7.6A8.38 8.38 0 0 1 12 3.5h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
        )}
      </button>
    </div>
  );
}
