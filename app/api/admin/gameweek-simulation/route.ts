import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { simulateGameweekEngine } from '@/lib/fantasyGameEngine';
import { recordOperation } from '@/lib/operations';

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const result = simulateGameweekEngine();
  await recordOperation({ service: 'fantasy-engine', operation: 'simulation', status: result.passed ? 'success' : 'error', duration_ms: 0, message: result.passed ? 'All isolated gameweek checks passed.' : 'One or more isolated checks failed.', metadata: { checks: result.checks } });
  return NextResponse.json(result, { status: result.passed ? 200 : 500 });
}
