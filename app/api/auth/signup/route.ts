import { NextResponse } from 'next/server';
import { createSessionToken, createUser, findUserByEmail, normalizeEmail, sessionCookieOptions, SESSION_COOKIE, validatePassword } from '@/lib/auth';
import { clientIdentifier, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const gate = rateLimit(`auth:signup:${clientIdentifier(request)}`, 8, 60_000);
  if (!gate.allowed) return NextResponse.json({ error: 'Too many signup attempts. Please wait a minute.' }, { status: 429 });

  try {
    const input = (await request.json()) as { email?: string; displayName?: string; password?: string };
    const email = normalizeEmail(input.email ?? '');
    const displayName = (input.displayName ?? '').trim();
    const password = input.password ?? '';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (displayName.length < 2 || displayName.length > 60) {
      return NextResponse.json({ error: 'Display name must be between 2 and 60 characters.' }, { status: 400 });
    }
    if (!validatePassword(password)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 });
    }

    const user = await createUser({ email, displayName, password });
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
