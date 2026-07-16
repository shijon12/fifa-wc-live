'use client';

import { FormEvent, useState } from 'react';

const interests = [
  ['fantasy', 'Fantasy leagues'],
  ['alerts', 'Team alerts'],
  ['stats', 'Stats dashboard'],
  ['news', 'Football news'],
  ['predictions', 'Predictions'],
  ['private-leagues', 'Private groups'],
  ['other', 'Something else'],
];

export function FeedbackForm({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/growth/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          name: form.get('name'),
          role: form.get('role'),
          favoriteTeam: form.get('favoriteTeam'),
          interest: form.get('interest'),
          message: form.get('message'),
          sourcePath: window.location.pathname,
        }),
      });
      const payload = await response.json() as { error?: string; configured?: boolean };
      if (!response.ok) throw new Error(payload.error ?? 'Unable to save feedback.');
      setStatus('success');
      setMessage(payload.configured === false ? 'Captured, but database storage needs the latest migration.' : 'Thank you — this is exactly the signal the product needs.');
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }

  return (
    <form onSubmit={submit} className={`rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 ${compact ? '' : 'sm:p-7'}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">Build with us</p>
      <h2 className="mt-3 text-2xl font-black text-white">{compact ? 'Join the waitlist' : 'Join the waitlist and shape what comes next'}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-400">
        Tell us what you would use most. This helps turn The Matchroom from a demo into a product people actually want.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder="Name" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <input name="email" type="email" placeholder="Email" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <input name="role" placeholder="Fan, founder, analyst, investor..." className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
        <input name="favoriteTeam" placeholder="Favorite team" className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4" />
      </div>

      <label className="mt-3 block">
        <span className="text-sm font-semibold text-stone-300">What would you use most?</span>
        <select name="interest" defaultValue="fantasy" className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 focus:ring-4">
          {interests.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>

      <textarea
        name="message"
        required
        minLength={3}
        maxLength={1200}
        placeholder="What should we improve, add, or simplify?"
        className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 placeholder:text-stone-600 focus:ring-4"
      />

      {message && (
        <div className={`mt-4 rounded-2xl border p-3 text-sm ${status === 'error' ? 'border-rose-400/20 bg-rose-400/10 text-rose-100' : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'}`}>
          {message}
        </div>
      )}

      <button disabled={status === 'loading'} className="mt-5 rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60">
        {status === 'loading' ? 'Saving…' : 'Send feedback'}
      </button>
    </form>
  );
}
