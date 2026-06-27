import { timingSafeEqual } from 'node:crypto';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function clientIdentifier(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'local';
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function verifyAIAccess(request: Request) {
  const configured = process.env.AI_ACCESS_CODE;
  if (!configured) {
    return {
      allowed: process.env.NODE_ENV !== 'production',
      reason: 'AI access is disabled until AI_ACCESS_CODE is configured.',
    };
  }
  const supplied = request.headers.get('x-ai-access-code') ?? '';
  const expectedBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  const allowed = expectedBuffer.length === suppliedBuffer.length
    && timingSafeEqual(expectedBuffer, suppliedBuffer);
  return { allowed, reason: 'Invalid AI access code.' };
}
