'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type ChatMessage = {
  id: number;
  leagueId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export function PrivateLeagueChat({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState(() => typeof window === 'undefined' ? '' : (window.localStorage.getItem(`matchroom-chat-draft:${leagueId}`) ?? '').slice(0, 500));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function loadMessages(showLoader = false) {
      if (showLoader) setLoading(true);
      try {
        const response = await fetch(`/api/fantasy/private-leagues/${encodeURIComponent(leagueId)}/messages`, { cache: 'no-store' });
        const data = await response.json() as { messages?: ChatMessage[]; error?: string };
        if (!active) return;
        if (!response.ok) throw new Error(data.error ?? 'Unable to load room chat.');
        setMessages(data.messages ?? []);
        setLastUpdated(new Date());
        setError('');
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load room chat.');
      } finally {
        if (active && showLoader) setLoading(false);
      }
    }
    loadMessages(true);
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') loadMessages(false); }, 3_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [open, leagueId]);

  useEffect(() => {
    const key = `matchroom-chat-draft:${leagueId}`;
    if (body) window.localStorage.setItem(key, body);
    else window.localStorage.removeItem(key);
  }, [body, leagueId]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const messageBody = body.trim();
    if (!messageBody || sending) return;
    setSending(true);
    setError('');
    try {
      const response = await fetch(`/api/fantasy/private-leagues/${encodeURIComponent(leagueId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: messageBody }),
      });
      const data = await response.json() as { message?: ChatMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? 'Unable to send message.');
      setMessages((current) => current.some((entry) => entry.id === data.message?.id) ? current : [...current, data.message as ChatMessage]);
      setBody('');
      setLastUpdated(new Date());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-300/[0.04]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full flex-col items-stretch gap-3 p-3 text-left hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Private room chat</p>
          <p className="mt-1 text-sm text-stone-400">Only members of {leagueName} can read and reply.</p>
        </div>
        <span className="w-full shrink-0 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-center text-xs font-black text-sky-100 sm:w-auto sm:py-1.5">{open ? 'Close' : 'Open chat'}</span>
      </button>

      {open && (
        <div className="border-t border-white/10 p-3 sm:p-4">
          <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3" aria-live="polite">
            {loading ? (
              <p className="py-8 text-center text-sm text-stone-500">Loading room messages…</p>
            ) : messages.length ? messages.map((message) => (
              <article key={message.id} className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-xs font-black text-sky-200">{message.displayName}</p>
                  <time className="shrink-0 text-[10px] text-stone-600" dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                <p className="mt-1 break-words text-sm leading-6 text-stone-200">{message.body}</p>
              </article>
            )) : (
              <div className="py-8 text-center">
                <p className="font-bold text-white">Start the conversation.</p>
                <p className="mt-1 text-sm text-stone-500">Talk lineups, captain picks, fixtures, and matchday bragging rights.</p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={sendMessage} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`chat-${leagueId}`} className="sr-only">Message {leagueName}</label>
            <input id={`chat-${leagueId}`} value={body} onChange={(event) => setBody(event.target.value.slice(0, 500))} maxLength={500} placeholder="Message your league…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-sky-300" />
            <button type="submit" disabled={sending || !body.trim()} className="w-full rounded-xl bg-sky-300 px-5 py-3 text-sm font-black text-[#07120d] disabled:opacity-40 sm:w-auto">{sending ? 'Sending…' : 'Send'}</button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-600">
            <span>{body.length}/500 · Draft saved on this device · Live sync every 3s</span>
            {lastUpdated && <span>Last updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
          </div>
          {error && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}
        </div>
      )}
    </section>
  );
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
