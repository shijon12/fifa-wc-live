import Link from 'next/link';
import { NewsletterUnsubscribeForm } from '@/components/NewsletterUnsubscribeForm';

export default async function NewsletterUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-[#07120d] p-6 shadow-2xl shadow-black/30 sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">The Matchroom Weekly</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Unsubscribe from the newsletter</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-stone-300 sm:text-base">
          No hard feelings. You can unsubscribe from weekly football digests here, and your account,
          private rooms, alerts, and fantasy access will continue to work normally.
        </p>

        <NewsletterUnsubscribeForm initialEmail={email} />

        <Link
          href="/"
          className="mt-8 inline-flex text-sm font-bold text-emerald-300 transition hover:text-emerald-200"
        >
          Back to The Matchroom
        </Link>
      </section>
    </main>
  );
}
