import { NextResponse } from 'next/server';
import { submitFeedback } from '@/lib/growth';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const quota = rateLimit(`feedback:${clientIdentifier(request)}`, 10, 60_000);
  if (!quota.allowed) return NextResponse.json({ error: 'Too many submissions. Please wait a minute.' }, { status: 429 });

  const input = await request.json().catch(() => ({})) as {
    email?: string;
    name?: string;
    role?: string;
    favoriteTeam?: string;
    interest?: string;
    message?: string;
    sourcePath?: string;
  };

  try {
    const result = await submitFeedback({
      email: input.email,
      name: input.name,
      role: input.role,
      favoriteTeam: input.favoriteTeam,
      interest: input.interest ?? 'other',
      message: input.message ?? '',
      sourcePath: input.sourcePath ?? '/',
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save feedback.' }, { status: 400 });
  }
}
