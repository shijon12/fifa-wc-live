import 'server-only';
import { isMissingTable, supabaseRest } from '@/lib/supabaseRest';

export type NewsletterInput = {
  email: string;
  name?: string | null;
  favoriteTeam?: string | null;
  sourcePath: string;
};

export type NewsletterSubscriber = {
  id: number;
  email: string;
  name: string | null;
  favorite_team: string | null;
  status: 'subscribed' | 'unsubscribed';
  subscribed_at: string;
  last_sent_at: string | null;
  source_path: string;
};

export type NewsletterSummary = {
  configured: boolean;
  count: number;
  recent: NewsletterSubscriber[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(input: NewsletterInput) {
  const email = clean(input.email, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');

  try {
    await supabaseRest('newsletter_subscriptions?on_conflict=email', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        email,
        name: clean(input.name ?? '', 100) || null,
        favorite_team: clean(input.favoriteTeam ?? '', 100) || null,
        cadence: 'weekly',
        status: 'subscribed',
        source_path: cleanPath(input.sourcePath),
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
        updated_at: new Date().toISOString(),
      }),
    });
    return { stored: true, configured: true };
  } catch (error) {
    if (isMissingTable(error)) return { stored: false, configured: false };
    throw error;
  }
}

export async function unsubscribeFromNewsletter(emailInput: string) {
  const email = clean(emailInput, 160).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new Error('Please enter a valid email address.');

  try {
    await supabaseRest(`newsletter_subscriptions?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    return { stored: true, configured: true };
  } catch (error) {
    if (isMissingTable(error)) return { stored: false, configured: false };
    throw error;
  }
}

export async function getNewsletterSummary(): Promise<NewsletterSummary> {
  try {
    const rows = await supabaseRest<NewsletterSubscriber[]>(
      'newsletter_subscriptions?select=id,email,name,favorite_team,status,subscribed_at,last_sent_at,source_path&order=subscribed_at.desc&limit=1000',
    );
    const active = rows.filter((row) => row.status === 'subscribed');
    return { configured: true, count: active.length, recent: active.slice(0, 10) };
  } catch (error) {
    if (isMissingTable(error)) return { configured: false, count: 0, recent: [] };
    throw error;
  }
}

export async function getActiveNewsletterSubscribers(limit = 500) {
  return supabaseRest<NewsletterSubscriber[]>(
    `newsletter_subscriptions?select=id,email,name,favorite_team,status,subscribed_at,last_sent_at,source_path&status=eq.subscribed&order=last_sent_at.asc.nullsfirst&limit=${limit}`,
  );
}

export async function markNewsletterSent(ids: number[]) {
  if (!ids.length) return;
  await supabaseRest(`newsletter_subscriptions?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
}

function clean(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanPath(value: string) {
  const path = clean(value, 240);
  return path.startsWith('/') ? path : '/';
}
