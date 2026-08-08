import 'server-only';
import * as Sentry from '@sentry/nextjs';
import { supabaseRest } from '@/lib/supabaseRest';

export type OperationStatus = 'success' | 'warning' | 'error';
export type OperationEvent = {
  id: number;
  service: string;
  operation: string;
  status: OperationStatus;
  duration_ms: number | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function recordOperation(input: Omit<OperationEvent, 'id' | 'created_at'>) {
  try {
    await supabaseRest('operational_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...input, message: input.message?.slice(0, 500) ?? null }),
    });
  } catch (error) {
    console.error('Unable to persist operational event', error);
  }
}

export async function recordFailure(service: string, operation: string, error: unknown, startedAt?: number, metadata: Record<string, unknown> = {}) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(normalized, { tags: { service, operation }, extra: metadata });
  await recordOperation({ service, operation, status: 'error', duration_ms: startedAt ? Date.now() - startedAt : null, message: normalized.message, metadata });
}

export async function getOperationsHealth() {
  const [events, pending, failed] = await Promise.all([
    supabaseRest<OperationEvent[]>('operational_events?select=*&order=created_at.desc&limit=100'),
    supabaseRest<Array<{ gameweek: number; season_key: string }>>('fantasy_gameweek_squads?finalized=eq.false&select=gameweek,season_key'),
    supabaseRest<Array<{ user_id: string; gameweek: number; scoring_attempts: number; last_scoring_error: string | null; last_scoring_attempt_at: string | null }>>('fantasy_gameweek_squads?last_scoring_error=not.is.null&select=user_id,gameweek,scoring_attempts,last_scoring_error,last_scoring_attempt_at&order=last_scoring_attempt_at.desc&limit=20'),
  ]);
  const latest = (service: string, operation?: string) => events.find((event) => event.service === service && (!operation || event.operation === operation)) ?? null;
  const provider = latest('fpl-provider');
  const currentSeason = typeof provider?.metadata?.season === 'string' ? provider.metadata.season : null;
  const unresolvedErrors = events.filter((event) => event.status === 'error' && !events.some((candidate) => candidate.service === event.service && candidate.operation === event.operation && candidate.status === 'success' && new Date(candidate.created_at).getTime() > new Date(event.created_at).getTime())).slice(0, 15);
  return {
    latestGameweekRun: latest('fantasy-engine', 'process'),
    latestFplResponse: provider,
    latestNotificationRun: latest('notifications', 'process'),
    notificationFailures: events.filter((event) => event.service === 'notifications' && event.status !== 'success').slice(0, 10),
    recentErrors: unresolvedErrors,
    pendingSnapshots: currentSeason ? pending.filter((row) => row.season_key === currentSeason).length : pending.length,
    failedScoringJobs: failed,
    sentryConfigured: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  };
}
