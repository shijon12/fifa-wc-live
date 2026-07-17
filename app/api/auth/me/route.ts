import { NextResponse } from 'next/server';
import { createSessionToken, getCurrentUser, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  const response = NextResponse.json({ user });
  if (user) response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}
