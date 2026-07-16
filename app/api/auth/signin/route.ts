import { NextResponse } from 'next/server';
import { createSessionToken, normalizeEmail, sessionCookieOptions, SESSION_COOKIE, signInUser } from '@/lib/auth';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = rateLimit(`auth:signin:${clientIdentifier(request)}`, 12, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many signin attempts. Please wait a minute.' }, { status: 429 });

  try {
    const input = (await request.json()) as { email?: string; password?: string };
    const user = await signInUser(normalizeEmail(input.email ?? ''), input.password ?? '');
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signin failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
