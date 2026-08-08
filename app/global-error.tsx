'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="en"><body className="grid min-h-screen place-items-center bg-[#07120d] p-6 text-white"><main className="max-w-lg rounded-3xl border border-white/10 bg-[#0b1b13] p-8 text-center"><p className="text-xs font-black uppercase tracking-[0.2em] text-rose-300">Something went wrong</p><h1 className="mt-3 text-3xl font-black">The Matchroom hit an unexpected error.</h1><p className="mt-3 text-stone-400">The incident has been recorded. Try the request again; your saved account data is unaffected.</p><button type="button" onClick={reset} className="mt-6 rounded-full bg-emerald-400 px-5 py-3 font-black text-[#07120d]">Try again</button></main></body></html>;
}
