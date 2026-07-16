'use client';

import { useSearchParams } from 'next/navigation';

const providers = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'github', label: 'Continue with GitHub' },
];

export function OAuthButtons() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/account';

  return (
    <div className="mt-5 space-y-2">
      {providers.map((provider) => (
        <a
          key={provider.id}
          href={`/api/auth/oauth/start?provider=${provider.id}&next=${encodeURIComponent(next)}`}
          className="flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
        >
          {provider.label}
        </a>
      ))}
      <p className="text-center text-xs leading-5 text-stone-500">
        Social sign-in requires the provider to be enabled in Supabase Auth.
      </p>
    </div>
  );
}
