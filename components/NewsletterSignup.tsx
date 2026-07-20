'use client';

import { FormEvent, useState } from 'react';

export function NewsletterSignup({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          favoriteTeam,
          sourcePath: window.location.pathname,
        }),
      });
      const data = await response.json() as { error?: string; configured?: boolean };
      if (!response.ok) throw new Error(data.error ?? 'Unable to subscribe.');
      setStatus('success');
      setMessage(data.configured === false
        ? 'You are on the newsletter list locally once storage is configured.'
        : 'You are in. Weekly football notes will land here when the digest starts.');
      setEmail('');
      setName('');
      setFavoriteTeam('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to subscribe.');
    }
  }

  return (
    <section className={`rounded-[1.5rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_85%_10%,rgba(52,211,153,0.14),transparent_35%),rgba(255,255,255,0.035)] ${compact ? 'p-5' : 'p-5 sm:rounded-[2rem] sm:p-7'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Weekly newsletter</p>
      <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Football without the tab chaos.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">
        Get a weekly Matchroom digest with the biggest football stories, recent results, upcoming fixtures, and product updates for matchday rooms.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="Email address" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name optional" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <input value={favoriteTeam} onChange={(event) => setFavoriteTeam(event.target.value)} placeholder="Favorite team optional" className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <button disabled={status === 'loading'} className="rounded-xl bg-emerald-400 px-5 py-3 font-black text-[#07120d] transition hover:bg-emerald-300 disabled:opacity-60">
          {status === 'loading' ? 'Joining…' : 'Join'}
        </button>
      </form>
      {message && (
        <p className={`mt-4 rounded-2xl border p-3 text-sm ${status === 'error' ? 'border-rose-400/20 bg-rose-400/10 text-rose-100' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'}`}>
          {message}
        </p>
      )}
      <p className="mt-3 text-xs leading-5 text-stone-500">No spam. This is for weekly football notes and Matchroom product updates.</p>
    </section>
  );
}
