import { NextResponse } from 'next/server';
import { pushConfiguration } from '@/lib/pushNotifications';

export async function GET() {
  const configuration = pushConfiguration();
  return NextResponse.json(configuration, {
    status: configuration.configured ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
