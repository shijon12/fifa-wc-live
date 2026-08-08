'use client';

import { useMemo, useRef, useState } from 'react';
import type { FantasyAgentAction } from '@/lib/fantasyAgentHarness';
import type { FantasyPlayer, FantasySquad } from '@/lib/fantasySquad';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

const QUICK_PROMPTS = [
  'Build me a balanced XI',
  'Make my squad more aggressive',
  'Who should captain this squad?',
  'Review my current team',
];

export function FantasyVirtualAgent({
  players,
  squad,
  managerName,
  onApply,
}: {
  players: FantasyPlayer[];
  squad: FantasySquad;
  managerName: string;
  onApply: (squad: FantasySquad) => void;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'Tell me what you want from your fantasy team. I can inspect your XI, find players, build a strategy, make transfers, and choose a captain.' },
  ]);
  const [pendingAction, setPendingAction] = useState<FantasyAgentAction | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  async function sendMessage(value: string) {
    const clean = value.trim();
    if (!clean || sending) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: clean };
    const history = messages.filter((entry) => entry.id !== 'welcome').map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, userMessage]);
    setMessage('');
    setError('');
    setPendingAction(null);
    setSending(true);
    try {
      const response = await fetch('/api/fantasy/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: clean, history, squad, managerName }),
      });
      const payload = await response.json() as { reply?: string; action?: FantasyAgentAction; error?: string; usage?: { remaining: number } };
      if (payload.usage) setRemaining(payload.usage.remaining);
      if (!response.ok) throw new Error(payload.error || 'The fantasy agent could not respond.');
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: payload.reply || 'I completed that request.',
      }]);
      setPendingAction(payload.action ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The fantasy agent could not respond.');
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function applyProposal() {
    if (!pendingAction) return;
    onApply(pendingAction.squad);
    setMessages((current) => [...current, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `${pendingAction.title} applied. Your normal account sync will save the updated squad.`,
    }]);
    setPendingAction(null);
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_90%_10%,rgba(167,139,250,0.16),transparent_38%),rgba(255,255,255,0.035)] p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300 sm:tracking-[0.24em]">Matchroom virtual agent</p>
            <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-violet-200">OpenAI powered</span>
          </div>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Chat with your fantasy co-manager</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">Give it an outcome, a player preference, or a transfer instruction. The separate rules harness checks every proposed change before you can apply it.</p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-violet-100/65">Data scope: official FPL prices, positions, clubs, published points, form, and your saved squad. It does not currently receive verified injuries, suspensions, or predicted lineups. Player data refreshes approximately every 60 seconds.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="w-full shrink-0 rounded-full bg-violet-300 px-4 py-2.5 text-sm font-black text-[#120d1d] hover:bg-violet-200 sm:w-auto">
          {open ? 'Close agent' : 'Open agent'}
        </button>
      </div>

      {open && (
        <div className="mt-5 min-w-0 border-t border-white/10 pt-5">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-black/25 p-3 sm:p-4">
              <div className="max-h-[420px] space-y-3 overflow-y-auto overscroll-contain pr-1" aria-live="polite">
                {messages.map((entry) => (
                  <div key={entry.id} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <p className={`max-w-[92%] break-words rounded-2xl px-3 py-2.5 text-sm leading-6 sm:max-w-[82%] ${entry.role === 'user' ? 'bg-emerald-400 text-[#07120d]' : 'border border-white/10 bg-white/[0.06] text-stone-200'}`}>
                      {entry.content}
                    </p>
                  </div>
                ))}
                {sending && <p className="w-fit animate-pulse rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-stone-400">Thinking and checking the player pool…</p>}
              </div>

              {pendingAction && (
                <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Review before applying</p>
                  <h3 className="mt-2 text-xl font-black text-white">{pendingAction.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-emerald-100/75">{pendingAction.summary}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <AgentMetric label="Cost" value={`${pendingAction.cost} / 100`} />
                    <AgentMetric label="Current points" value={String(pendingAction.projectedPoints)} />
                  </div>
                  <div className="mt-3 space-y-1">
                    {pendingAction.changes.map((change) => <p key={change} className="break-words text-xs leading-5 text-stone-300">{change}</p>)}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {pendingAction.squad.playerIds.map((id) => {
                      const player = playerById.get(id);
                      return player ? (
                        <div key={id} className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 px-3 py-2">
                          <p className="truncate text-sm font-bold text-white">
                            {player.name}
                            {pendingAction.squad.captainId === id ? ' · Captain' : pendingAction.squad.viceCaptainId === id ? ' · Vice-captain' : ''}
                            {(pendingAction.squad.starterIds ?? []).includes(id) ? ' · Starter' : ' · Bench'}
                          </p>
                          <p className="truncate text-xs text-stone-500">{player.team} · {player.position} · {player.price}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={applyProposal} className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-black text-[#07120d] hover:bg-emerald-300">Apply proposal</button>
                    <button type="button" onClick={() => setPendingAction(null)} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10">Dismiss</button>
                  </div>
                </div>
              )}

              {error && <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm leading-5 text-rose-100">{error}</p>}
              <form className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void sendMessage(message); }}>
                <input
                  ref={inputRef}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={1_000}
                  placeholder="e.g. Replace my weakest forward"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-stone-600 focus:border-violet-300/50"
                />
                <button type="submit" disabled={sending || !message.trim()} className="rounded-xl bg-violet-300 px-5 py-3 text-sm font-black text-[#120d1d] disabled:cursor-not-allowed disabled:opacity-40">Send</button>
              </form>
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Try asking</p>
                <div className="mt-3 grid gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" disabled={sending} onClick={() => void sendMessage(prompt)} className="min-w-0 break-words rounded-xl border border-white/10 px-3 py-2 text-left text-sm font-semibold text-stone-300 hover:bg-white/10 disabled:opacity-40">
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-500">Safe agent access</p>
                <p className="mt-3 text-sm font-bold text-white">{remaining === null ? '20 messages per day' : `${remaining} messages left today`}</p>
                <p className="mt-2 text-xs leading-5 text-stone-600">Available to signed-in managers. The daily allowance protects service capacity and resets at 00:00 UTC.</p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

function AgentMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="break-words font-black text-white">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-stone-500">{label}</p></div>;
}
