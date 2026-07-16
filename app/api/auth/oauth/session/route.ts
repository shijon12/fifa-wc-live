import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth';

type SupabaseOAuthUser = {
  id?: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    display_name?: string;
    role?: 'user' | 'admin';
  };
};

export async function POST(request: Request) {
  const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accessToken) return NextResponse.json({ error: 'Missing OAuth token.' }, { status: 401 });
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: 'Supabase auth is not configured.' }, { status: 503 });

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });
  if (!authResponse.ok) return NextResponse.json({ error: 'Unable to verify social sign-in.' }, { status: 401 });

  const user = await authResponse.json() as SupabaseOAuthUser;
  if (!user.id || !user.email) return NextResponse.json({ error: 'Social account did not return an email.' }, { status: 400 });

  const displayName = user.user_metadata?.display_name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? user.email.split('@')[0];
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken({
    id: user.id,
    email: user.email,
    displayName,
    role: user.user_metadata?.role ?? 'user',
  }), sessionCookieOptions());
  return response;
}
