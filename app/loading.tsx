export default function Loading() {
  return (
    <main className="min-h-screen bg-[#07120d] px-4 py-6 text-stone-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <div className="h-14 animate-pulse rounded-full border border-white/10 bg-white/[0.04]" />
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="h-[420px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
          <div className="h-[420px] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04]" />
        </section>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </section>
      </div>
    </main>
  );
}
