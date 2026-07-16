'use client';

import { FormEvent, useState } from 'react';

export function ReportIssueForm() {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('');
    const response = await fetch('/api/moderation/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: 'bug', reason, details }),
    });
    setStatus(response.ok ? 'Thanks — the report was sent.' : 'Unable to send report right now.');
    if (response.ok) {
      setReason('');
      setDetails('');
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Feedback</p>
      <h2 className="mt-2 text-2xl font-black text-white">Report an issue</h2>
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Short reason" className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-sky-400/30 focus:ring-4" />
      <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What happened?" className="mt-3 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-white outline-none ring-sky-400/30 focus:ring-4" />
      <button className="mt-3 rounded-full bg-sky-300 px-5 py-3 font-black text-[#07120d]">Send report</button>
      {status && <p className="mt-3 text-sm text-stone-400">{status}</p>}
    </form>
  );
}
