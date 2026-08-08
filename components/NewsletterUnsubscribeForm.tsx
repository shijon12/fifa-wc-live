'use client';

import { useState } from 'react';

export function NewsletterUnsubscribeForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Unable to unsubscribe right now.');

      setStatus('success');
      setMessage('You have been unsubscribed from The Matchroom Weekly.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to unsubscribe right now.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">Email address</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-stone-800 bg-stone-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-400"
          placeholder="you@example.com"
        />
      </label>

      <button
        type="submit"
        disabled={status === 'saving'}
        className="w-full rounded-full bg-emerald-400 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {status === 'saving' ? 'Unsubscribing...' : 'Unsubscribe'}
      </button>

      {message ? (
        <p className={status === 'error' ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
