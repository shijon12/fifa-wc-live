'use client';

import { FormEvent, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };
type PendingAction = { type: 'post_room_message'; body: string };

export function PrivateLeagueAgent({ leagueId, leagueName }: { leagueId: string; leagueName: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState<PendingAction | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const history = [...messages, { role: 'user' as const, content: text }];
    setMessages(history);
    setInput('');
    setLoading(true);
    setError('');
    setAction(null);
    try {
      const response = await fetch(`/api/fantasy/private-leagues/${encodeURIComponent(leagueId)}/agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: messages }),
      });
      const data = await response.json() as { reply?: string; action?: PendingAction; error?: string };
      if (!response.ok) throw new Error(data.error ?? 'The room agent is unavailable.');
      setMessages((current) => [...current, { role: 'assistant', content: data.reply ?? 'I completed the room analysis.' }]);
      setAction(data.action ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The room agent is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  async function postDraft() {
    if (!action || posting) return;
    setPosting(true);
    setError('');
    try {
      const response = await fetch(`/api/fantasy/private-leagues/${encodeURIComponent(leagueId)}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: action.body }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Unable to post the message.');
      setMessages((current) => [...current, { role: 'assistant', content: 'Posted to the private room chat.' }]);
      setAction(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to post the message.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-violet-300/20 bg-violet-300/[0.045]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full flex-col items-stretch gap-3 p-3 text-left hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Matchroom room agent</p>
          <p className="mt-1 text-sm text-stone-400">Ask about {leagueName}, analyze the table, or draft a room challenge.</p>
          <p className="mt-1 text-[11px] leading-5 text-violet-100/60">Uses current room members, saved squads, prediction activity, standings, and recent chat—not injuries or private information outside this room.</p>
        </div>
        <span className="w-full shrink-0 rounded-full bg-violet-300 px-3 py-2 text-center text-xs font-black text-[#130c24] sm:w-auto sm:py-1.5">{open ? 'Close' : 'Ask agent'}</span>
      </button>
      {open && <div className="border-t border-white/10 p-3 sm:p-4">
        <div className="max-h-72 space-y-2 overflow-y-auto" aria-live="polite">
          {!messages.length && <p className="rounded-xl bg-black/20 p-3 text-sm leading-6 text-stone-400">Try “Who is leading?”, “Who has not completed a squad?”, or “Draft a challenge for this matchday.”</p>}
          {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-xl p-3 text-sm leading-6 ${message.role === 'assistant' ? 'mr-6 bg-violet-300/10 text-violet-50' : 'ml-6 bg-white/10 text-white'}`}>{message.content}</div>)}
          {loading && <div className="mr-6 flex items-center gap-2 rounded-xl bg-violet-300/10 p-3 text-sm text-violet-100"><span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-200 border-r-transparent" />Analyzing live room data</div>}
        </div>
        {action && <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Draft—not posted</p>
          <p className="mt-2 text-sm leading-6 text-amber-50">{action.body}</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={postDraft} disabled={posting} className="rounded-full bg-amber-300 px-3 py-2 text-xs font-black text-[#171006] disabled:opacity-50 sm:px-4">{posting ? 'Posting' : 'Post to room'}</button><button type="button" onClick={() => setAction(null)} className="rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-stone-300 sm:px-4">Dismiss</button></div>
        </div>}
        <form onSubmit={send} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={input} onChange={(event) => setInput(event.target.value.slice(0, 800))} placeholder="Ask your room agent…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none focus:border-violet-300" />
          <button disabled={loading || !input.trim()} className="w-full rounded-xl bg-violet-300 px-5 py-3 text-sm font-black text-[#130c24] disabled:opacity-40 sm:w-auto">Send</button>
        </form>
        {error && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p>}
      </div>}
    </section>
  );
}
