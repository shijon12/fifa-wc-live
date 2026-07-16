import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createModerationReport, listModerationReports } from '@/lib/moderation';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  return NextResponse.json(await listModerationReports());
}

export async function POST(request: Request) {
  const gate = rateLimit(`moderation:${clientIdentifier(request)}`, 10, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many reports. Try again shortly.' }, { status: 429 });
  const user = await getCurrentUser();
  const input = (await request.json()) as { targetType?: string; targetId?: string; reason?: string; details?: string };
  const targetType = input.targetType;
  if (!targetType || !['user', 'league', 'content', 'bug'].includes(targetType)) return NextResponse.json({ error: 'Invalid report type.' }, { status: 400 });
  const reason = String(input.reason ?? '').trim().slice(0, 120);
  if (reason.length < 3) return NextResponse.json({ error: 'Reason is too short.' }, { status: 400 });
  return NextResponse.json(await createModerationReport({
    reporter_user_id: user?.id ?? null,
    target_type: targetType as 'user' | 'league' | 'content' | 'bug',
    target_id: input.targetId?.slice(0, 120) ?? null,
    reason,
    details: input.details?.slice(0, 2000) ?? null,
  }));
}
