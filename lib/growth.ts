import 'server-only';
import { isMissingTable, supabaseRest } from '@/lib/supabaseRest';

export type ProductEventInput = {
  userId?: string | null;
  anonymousId?: string | null;
  eventName: string;
  path: string;
  feature?: string | null;
  metadata?: Record<string, unknown>;
};

export type FeedbackInput = {
  email?: string | null;
  name?: string | null;
  role?: string | null;
  favoriteTeam?: string | null;
  interest: string;
  message: string;
  sourcePath: string;
};

export type GrowthSummary = {
  configured: boolean;
  totalEvents: number;
  uniqueVisitors: number;
  waitlistCount: number;
  topFeatures: Array<{ feature: string; count: number }>;
  recentFeedback: Array<{
    id: number;
    email: string | null;
    name: string | null;
    role: string | null;
    favorite_team: string | null;
    interest: string;
    message: string;
    source_path: string;
    created_at: string;
  }>;
};

type ProductEventRow = {
  anonymous_id: string | null;
  event_name: string;
  feature: string | null;
  created_at: string;
};

const VALID_INTERESTS = new Set(['fantasy', 'alerts', 'stats', 'news', 'predictions', 'private-leagues', 'other']);

export async function recordProductEvent(input: ProductEventInput) {
  const eventName = clean(input.eventName, 80);
  const path = cleanPath(input.path);
  if (eventName.length < 2) return { stored: false, configured: false };

  try {
    await supabaseRest('product_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: input.userId ?? null,
        anonymous_id: clean(input.anonymousId ?? '', 120) || null,
        event_name: eventName,
        path,
        feature: clean(input.feature ?? '', 80) || null,
        metadata: input.metadata ?? {},
      }),
    });
    return { stored: true, configured: true };
  } catch (error) {
    if (isMissingTable(error)) return { stored: false, configured: false };
    throw error;
  }
}

export async function submitFeedback(input: FeedbackInput) {
  const interest = VALID_INTERESTS.has(input.interest) ? input.interest : 'other';
  const message = clean(input.message, 1200);
  if (message.length < 3) throw new Error('Please share a little more detail.');

  try {
    await supabaseRest('waitlist_feedback', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        email: clean(input.email ?? '', 120) || null,
        name: clean(input.name ?? '', 100) || null,
        role: clean(input.role ?? '', 80) || null,
        favorite_team: clean(input.favoriteTeam ?? '', 100) || null,
        interest,
        message,
        source_path: cleanPath(input.sourcePath),
      }),
    });
    return { stored: true, configured: true };
  } catch (error) {
    if (isMissingTable(error)) return { stored: false, configured: false };
    throw error;
  }
}

export async function getGrowthSummary(): Promise<GrowthSummary> {
  try {
    const [events, feedback] = await Promise.all([
      supabaseRest<ProductEventRow[]>('product_events?select=anonymous_id,event_name,feature,created_at&order=created_at.desc&limit=1000'),
      supabaseRest<GrowthSummary['recentFeedback']>('waitlist_feedback?select=id,email,name,role,favorite_team,interest,message,source_path,created_at&order=created_at.desc&limit=25'),
    ]);
    const uniqueVisitors = new Set(events.map((event) => event.anonymous_id).filter(Boolean)).size;
    const featureCounts = new Map<string, number>();
    for (const event of events) {
      const feature = event.feature || event.event_name;
      featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1);
    }
    const topFeatures = Array.from(featureCounts.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      configured: true,
      totalEvents: events.length,
      uniqueVisitors,
      waitlistCount: feedback.length,
      topFeatures,
      recentFeedback: feedback,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return { configured: false, totalEvents: 0, uniqueVisitors: 0, waitlistCount: 0, topFeatures: [], recentFeedback: [] };
    }
    throw error;
  }
}

function clean(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function cleanPath(value: string) {
  const path = clean(value, 240);
  return path.startsWith('/') ? path : '/';
}
