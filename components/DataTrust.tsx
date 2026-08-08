type HealthItem = {
  label: string;
  status: 'live' | 'derived' | 'provider' | 'limited';
  detail: string;
};

const statusStyles: Record<HealthItem['status'], string> = {
  live: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
  derived: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
  provider: 'border-violet-400/20 bg-violet-400/10 text-violet-100',
  limited: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
};

const statusLabels: Record<HealthItem['status'], string> = {
  live: 'Live',
  derived: 'Derived',
  provider: 'Provider',
  limited: 'Limited',
};

export function SourcePill({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">
      {children}
    </span>
  );
}

export function DataSourceHealth({ items, refreshedAt }: { items: HealthItem[]; refreshedAt: Date }) {
  return (
    <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Data source health</p>
          <h2 className="mt-2 text-xl font-black text-white">What is fresh, derived, or provider-limited</h2>
        </div>
        <p className="text-xs font-semibold text-stone-500">Last updated {formatHealthTime(refreshedAt)}</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className={`rounded-2xl border p-4 ${statusStyles[item.status]}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-white">{item.label}</h3>
              <span className="rounded-full bg-black/20 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
                {statusLabels[item.status]}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 opacity-80">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatHealthTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
