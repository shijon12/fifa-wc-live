import Link from 'next/link';

export function MobileFeedbackButton() {
  return (
    <Link
      href="/about#feedback"
      className="fixed bottom-4 right-4 z-40 rounded-full border border-emerald-300/30 bg-emerald-400 px-4 py-3 text-sm font-black text-[#07120d] shadow-2xl shadow-black/30 md:hidden"
    >
      Feedback
    </Link>
  );
}
