export type FantasyAgentUsage = {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
};

export async function claimFantasyAgentUsage(userId: string): Promise<FantasyAgentUsage> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const limit = dailyLimit();
  if (!url || !serviceKey) {
    if (process.env.NODE_ENV === 'production') throw new Error('Fantasy agent usage storage is not configured.');
    return { allowed: true, used: 1, remaining: limit - 1, limit };
  }

  const response = await fetch(`${url}/rest/v1/rpc/claim_fantasy_agent_usage`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: userId, p_daily_limit: limit }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unable to verify fantasy agent allowance.');
  const payload = await response.json() as Array<{ allowed: boolean; used: number; remaining: number }>;
  const result = payload[0];
  if (!result) throw new Error('Fantasy agent allowance returned no result.');
  return { allowed: result.allowed, used: result.used, remaining: result.remaining, limit };
}

function dailyLimit() {
  const configured = Number(process.env.FANTASY_AGENT_DAILY_LIMIT ?? 20);
  return Number.isFinite(configured) ? Math.max(1, Math.min(100, Math.floor(configured))) : 20;
}
