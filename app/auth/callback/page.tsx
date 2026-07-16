'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackInner />
    </Suspense>
  );
}

function OAuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    const next = searchParams.get('next') || '/account';
    if (!accessToken) {
      queueMicrotask(() => setError('The social provider did not return a usable session. Check that the provider is enabled in Supabase.'));
      return;
    }
    fetch('/api/auth/oauth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(payload.error ?? 'Unable to finish social sign-in.');
        }
        router.replace(next);
        router.refresh();
      })
      .catch((issue) => setError(issue instanceof Error ? issue.message : 'Unable to finish social sign-in.'));
  }, [router, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#07120d] px-4 text-stone-100">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.045] p-7 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">Social sign-in</p>
        <h1 className="mt-3 text-3xl font-black text-white">{error ? 'Could not sign you in' : 'Finishing sign-in…'}</h1>
        <p className="mt-3 text-sm leading-6 text-stone-400">
          {error || 'The Matchroom is connecting your social account.'}
        </p>
        {error && (
          <Link href="/sign-in" className="mt-6 inline-flex rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d]">
            Back to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
