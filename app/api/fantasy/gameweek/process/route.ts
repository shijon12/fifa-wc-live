import { NextResponse } from 'next/server';
import { processAllFantasyGameweeks } from '@/lib/fantasyGameEngine';

export async function GET(request: Request) { const secret = process.env.CRON_SECRET; const authorization = request.headers.get('authorization'); if (!secret || authorization !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }); try { return NextResponse.json({ ok: true, ...(await processAllFantasyGameweeks()) }); } catch (error) { console.error('Fantasy gameweek processing failed', error); return NextResponse.json({ error: 'Gameweek processing failed.' }, { status: 500 }); } }
