'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { OAuthButtons } from '@/components/OAuthButtons';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/account';
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'sign-up';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${isSignup ? 'signup' : 'signin'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'Authentication failed.');
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">{isSignup ? 'Create account' : 'Welcome back'}</p>
      <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
        {isSignup ? 'Join the football control room.' : 'Sign in to your account.'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-stone-400">
        {isSignup
          ? 'Save your fantasy profile and unlock protected fan features.'
          : 'Continue to your protected fantasy and account features.'}
      </p>

      <div className="mt-6 space-y-4">
        {isSignup && (
          <label className="block">
            <span className="text-sm font-semibold text-stone-300">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 focus:ring-4"
              minLength={2}
              maxLength={60}
              required
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm font-semibold text-stone-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 focus:ring-4"
            autoComplete="email"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-stone-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-emerald-400/30 focus:ring-4"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
        </label>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.2em] text-stone-600">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <OAuthButtons />

      <p className="mt-5 text-center text-sm text-stone-400">
        {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link href={isSignup ? `/sign-in?next=${encodeURIComponent(next)}` : `/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold text-emerald-300 hover:text-emerald-200">
          {isSignup ? 'Sign in' : 'Sign up'}
        </Link>
      </p>
    </form>
  );
}
