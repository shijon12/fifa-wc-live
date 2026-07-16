import { NextResponse } from 'next/server';

const providers = new Set(['google', 'github', 'apple', 'azure']);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') ?? '';
  const next = url.searchParams.get('next') || '/account';
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || url.origin;

  if (!providers.has(provider)) return NextResponse.json({ error: 'Unsupported provider.' }, { status: 400 });
  if (!supabaseUrl) return NextResponse.json({ error: 'Supabase auth is not configured.' }, { status: 503 });

  const redirectTo = new URL('/auth/callback', siteUrl);
  redirectTo.searchParams.set('next', next.startsWith('/') ? next : '/account');

  const destination = new URL(`${supabaseUrl}/auth/v1/authorize`);
  destination.searchParams.set('provider', provider);
  destination.searchParams.set('redirect_to', redirectTo.toString());

  return NextResponse.redirect(destination);
}
