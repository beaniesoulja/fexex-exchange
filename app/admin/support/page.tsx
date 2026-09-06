/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import { useAdmin } from "../admin-context";
import type { SupportTicketMessage } from "../admin-types";

export default function AdminSupportPage() {
  const { supportTickets, setSupportTickets, fetchSupportTickets } = useAdmin();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loadError, setLoadError] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const selectedTicket = supportTickets.find((ticket) => ticket.id === selectedTicketId) ?? supportTickets[0] ?? null;

  const selectTicket = (id: string) => {
    setSelectedTicketId(id);
    setMessages([]);
  };

  useEffect(() => {
    if (!selectedTicket) return;
    let active = true;
    let inFlight = false;
    const load = () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      void fetch(`/api/support/tickets/${selectedTicket.id}/messages`, { cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error ?? "We could not load this ticket.");
          return data as { messages: SupportTicketMessage[] };
        })
        .then((data) => {
          if (!active) return;
          setMessages(data.messages);
          setLoadError("");
        })
        .catch((error: unknown) => {
          if (active) setLoadError(error instanceof Error ? error.message : "We could not load this ticket.");
        })
        .finally(() => { inFlight = false; });
    };
    load();
    const timer = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [selectedTicket]);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList) return;
    messageList.scrollTo({ top: messageList.scrollHeight });
  }, [messages]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = body.trim();
    if (!message || !selectedTicket || sending) return;
    setSending(true);
    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const saved = await response.json().catch(() => null);
      if (!response.ok) throw new Error(saved?.error ?? "We could not send your reply.");
      setMessages((current) => current.some((item) => item.id === saved.id) ? current : [...current, saved]);
      setBody("");
      void fetchSupportTickets();
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "We could not send your reply.");
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selectedTicket) return;
    const nextStatus = selectedTicket.status === "OPEN" ? "CLOSED" : "OPEN";
    setStatusSaving(true);
    try {
      const response = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.id, status: nextStatus }),
      });
      if (!response.ok) throw new Error("We could not update this ticket.");
      setSupportTickets((current) => current.map((ticket) => ticket.id === selectedTicket.id ? { ...ticket, status: nextStatus } : ticket));
    } catch (error: unknown) {
      setLoadError(error instanceof Error ? error.message : "We could not update this ticket.");
    } finally {
      setStatusSaving(false);
    }
  };

  const openCount = supportTickets.filter((ticket) => ticket.status === "OPEN").length;

  return (
    <section className="fexex-pop-in" aria-labelledby="support-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#c6f65c]">CUSTOMER SUPPORT</p>
          <h2 id="support-heading" className="mt-1 text-2xl font-bold">Support inbox</h2>
          <p className="mt-1 text-sm text-[#a9afa9]">Reply to customer tickets and close them once resolved.</p>
        </div>
        <span className="rounded-full bg-[#c6f65c]/15 px-3 py-1.5 text-xs font-bold text-[#d8ff96]">{openCount} open</span>
      </div>

      {supportTickets.length === 0 ? (
        <div className="rounded-3xl border border-[#c6f65c]/20 bg-[#202323] p-10 text-center">
          <p className="text-lg font-bold">No support tickets yet</p>
          <p className="mt-2 text-sm text-[#a9afa9]">Customer tickets will appear here as they come in.</p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] xl:max-h-[780px] xl:overflow-y-auto">
            <div className="border-b border-[#f4f3ee]/10 px-4 py-4"><p className="text-xs font-bold tracking-wide text-[#a9afa9]">ALL TICKETS</p></div>
            <div className="p-2">
              {supportTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => selectTicket(ticket.id)}
                  className={`mb-1 w-full rounded-2xl p-3 text-left transition ${selectedTicket?.id === ticket.id ? "bg-[#c6f65c] text-[#151817]" : "text-[#d7dbd4] hover:bg-[#2a302d]"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-bold">{ticket.subject}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ticket.status === "OPEN" ? (selectedTicket?.id === ticket.id ? "bg-[#151817]/10" : "bg-[#c6f65c]/15 text-[#d8ff96]") : (selectedTicket?.id === ticket.id ? "bg-[#151817]/10" : "bg-[#f4f3ee]/10 text-[#a9afa9]")}`}>{ticket.status}</span>
                  </div>
                  <p className={`mt-1 truncate text-xs ${selectedTicket?.id === ticket.id ? "text-[#26321e]" : "text-[#a9afa9]"}`}>{ticket.user.email}</p>
                  {ticket.lastMessage && <p className={`mt-2 truncate text-xs ${selectedTicket?.id === ticket.id ? "text-[#26321e]" : "text-[#777a75]"}`}>{ticket.lastMessage.body || "Sent an image"}</p>}
                </button>
              ))}
            </div>
          </aside>

          {selectedTicket && (
            <div className="min-w-0 space-y-5">
              <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selectedTicket.status === "OPEN" ? "bg-[#c6f65c]/15 text-[#d8ff96]" : "bg-[#f4f3ee]/10 text-[#a9afa9]"}`}>{selectedTicket.status}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-bold">{selectedTicket.subject}</h3>
                    <p className="mt-1 break-all text-sm text-[#a9afa9]">Customer: {selectedTicket.user.email}</p>
                  </div>
                  <button type="button" onClick={() => void toggleStatus()} disabled={statusSaving} className="rounded-xl bg-[#d6c7ff] px-4 py-2.5 text-sm font-bold text-[#161818] disabled:opacity-60">
                    {statusSaving ? "Saving..." : selectedTicket.status === "OPEN" ? "Mark closed" : "Reopen ticket"}
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-[#f4f3ee]/10 bg-[#202323] p-5 sm:p-6">
                <div ref={messageListRef} className="max-h-[460px] min-h-72 space-y-4 overflow-y-auto rounded-2xl border border-[#f4f3ee]/5 bg-[#171a1a] p-4 sm:p-5" aria-live="polite">
                  {messages.length ? messages.map((message) => {
                    const isAdmin = message.sender.role === "ADMIN";
                    return (
                      <div key={message.id} className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${message.isOwn ? "rounded-br-md bg-[#c6f65c] text-[#161818]" : isAdmin ? "rounded-bl-md bg-[#d6c7ff] text-[#161818]" : "rounded-bl-md bg-[#2a2e2d] text-[#f4f3ee]"}`}>
                          <div className="mb-1.5 flex items-center justify-between gap-4">
                            <p className="text-xs font-bold">{message.isOwn ? "You" : isAdmin ? "FEXEX Admin" : message.sender.displayName}</p>
                            <time dateTime={message.createdAt} className={`shrink-0 text-[10px] font-medium ${message.isOwn || isAdmin ? "text-[#161818]/60" : "text-[#a9afa9]"}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                          </div>
                          {message.imageData && <img src={message.imageData} alt={`${message.sender.displayName} attached an image`} className="mb-2 max-h-72 w-full rounded-xl object-cover" />}
                          {message.body && <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>}
                        </div>
                      </div>
                    );
                  }) : <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center"><p className="text-sm text-[#a9afa9]">Loading conversation…</p></div>}
                </div>

                {loadError && <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">{loadError}</p>}

                <form onSubmit={send} className="mt-4 flex gap-2">
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={1000} rows={2} placeholder="Write a reply" className="min-w-0 flex-1 resize-none rounded-2xl border border-[#f4f3ee]/15 bg-[#f4f3ee] px-4 py-3 text-sm text-[#161818] outline-none placeholder:text-[#777a75] focus:border-[#c6f65c] focus:ring-2 focus:ring-[#c6f65c]/30" />
                  <button type="submit" disabled={!body.trim() || sending} className="self-end rounded-2xl bg-[#c6f65c] px-5 py-3 font-bold text-[#161818] transition hover:bg-[#d9ff86] disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Reply"}</button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
