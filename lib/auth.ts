import { cookies } from 'next/headers';
import crypto from 'node:crypto';

const SESSION_COOKIE = 'fifa_wc_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
};

export type FantasyPick = {
  matchId: string;
  choice: 'home' | 'draw' | 'away';
  confidence: number;
};

export type FantasyProfile = {
  managerName: string;
  picks: Record<string, FantasyPick>;
  updatedAt?: string;
};

type StoredUser = AuthUser & {
  createdAt: string | null;
};

type SupabaseAuthUser = {
  id: string;
  email: string;
  created_at?: string;
  user_metadata?: {
    display_name?: string;
    role?: 'user' | 'admin';
    fantasy?: FantasyProfile;
  };
};

type SessionPayload = {
  sub: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  exp: number;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase auth storage is not configured.');
  }
  return { url, serviceKey };
}

function authSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is required in production.');
  }
  return secret ?? 'development-only-auth-secret';
}

function headers() {
  const { serviceKey } = supabaseConfig();
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

function mapAuthUser(user: SupabaseAuthUser): StoredUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.user_metadata?.display_name ?? user.email.split('@')[0],
    role: user.user_metadata?.role ?? 'user',
    createdAt: user.created_at ?? null,
  };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string) {
  return password.length >= 8;
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(normalizeEmail(email))}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to read user account.');
  const payload = (await response.json()) as { users?: SupabaseAuthUser[] } | SupabaseAuthUser[];
  const users = Array.isArray(payload) ? payload : payload.users ?? [];
  const user = users.find((entry) => entry.email?.toLowerCase() === normalizeEmail(email));
  return user ? mapAuthUser(user) : null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  if (!/^[a-f\d-]{36}$/i.test(id)) return null;
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return mapAuthUser((await response.json()) as SupabaseAuthUser);
}

export async function getUserFantasyProfile(id: string): Promise<FantasyProfile> {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to read fantasy profile.');
  const user = (await response.json()) as SupabaseAuthUser;
  return user.user_metadata?.fantasy ?? {
    managerName: user.user_metadata?.display_name ?? user.email.split('@')[0],
    picks: {},
  };
}

export async function updateUserFantasyProfile(user: AuthUser, fantasy: FantasyProfile) {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      user_metadata: {
        display_name: user.displayName,
        role: user.role,
        fantasy: {
          managerName: fantasy.managerName.slice(0, 60) || user.displayName,
          picks: fantasy.picks,
          updatedAt: new Date().toISOString(),
        },
      },
    }),
  });
  if (!response.ok) throw new Error('Unable to save fantasy profile.');
}

export async function listFantasyProfiles(): Promise<Array<AuthUser & { fantasy: FantasyProfile }>> {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users?per_page=200`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to read leaderboard.');
  const payload = (await response.json()) as { users?: SupabaseAuthUser[] } | SupabaseAuthUser[];
  const users = Array.isArray(payload) ? payload : payload.users ?? [];
  return users.map((entry) => {
    const user = mapAuthUser(entry);
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      fantasy: entry.user_metadata?.fantasy ?? { managerName: user.displayName, picks: {} },
    };
  });
}

export async function createUser(input: { email: string; displayName: string; password: string }): Promise<AuthUser> {
  const { url } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email: normalizeEmail(input.email),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        display_name: input.displayName.trim(),
        role: 'user',
      },
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { msg?: string; message?: string; error_description?: string };
    const message = payload.msg ?? payload.message ?? payload.error_description ?? 'Unable to create account.';
    if (response.status === 422 || response.status === 400) throw new Error(message);
    throw new Error('Unable to create account.');
  }
  return mapAuthUser((await response.json()) as SupabaseAuthUser);
}

export async function signInUser(email: string, password: string): Promise<AuthUser | null> {
  const { url, serviceKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: normalizeEmail(email), password }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { user?: SupabaseAuthUser };
  return payload.user ? mapAuthUser(payload.user) : null;
}

export function createSessionToken(user: AuthUser) {
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', authSecret()).update(encoded).digest('base64url');
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, displayName: payload.displayName, role: payload.role };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export { SESSION_COOKIE };
