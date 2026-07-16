import 'server-only';

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase is not configured.');
  return { url, serviceKey };
}

export async function supabaseRest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceKey } = supabaseConfig();
  const headers = new Headers(init.headers);
  headers.set('apikey', serviceKey);
  headers.set('Authorization', `Bearer ${serviceKey}`);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST failed (${response.status}): ${body.slice(0, 240)}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function isMissingTable(error: unknown) {
  return error instanceof Error && (
    error.message.includes('42P01')
    || error.message.toLowerCase().includes('does not exist')
    || error.message.toLowerCase().includes('schema cache')
  );
}
