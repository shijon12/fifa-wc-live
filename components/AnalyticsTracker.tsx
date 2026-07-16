'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const VISITOR_KEY = 'matchroom_visitor_id';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const path = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    track('page_view', path, 'page', { title: document.title, referrer: document.referrer || null });
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('a,button') : null;
      if (!target) return;
      const label = (target.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const href = target instanceof HTMLAnchorElement ? target.href : null;
      const feature = target.getAttribute('data-feature') ?? inferFeature(href, label);
      track('feature_click', window.location.pathname, feature, { label, href });
    }
    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, []);

  return null;
}

function track(eventName: string, path: string, feature: string, metadata: Record<string, unknown>) {
  const payload = JSON.stringify({
    anonymousId: getVisitorId(),
    eventName,
    path,
    feature,
    metadata,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/signals/analytics', new Blob([payload], { type: 'application/json' }));
    return;
  }
  fetch('/api/signals/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

function getVisitorId() {
  const existing = localStorage.getItem(VISITOR_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(VISITOR_KEY, id);
  return id;
}

function inferFeature(href: string | null, label: string) {
  const text = `${href ?? ''} ${label}`.toLowerCase();
  if (text.includes('fantasy')) return 'fantasy';
  if (text.includes('favorite') || text.includes('team')) return 'alerts';
  if (text.includes('stat')) return 'stats';
  if (text.includes('prediction') || text.includes('forecast')) return 'predictions';
  if (text.includes('league')) return 'leagues';
  if (text.includes('news')) return 'news';
  if (text.includes('sign')) return 'auth';
  return 'navigation';
}
