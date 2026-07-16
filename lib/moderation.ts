import 'server-only';
import { isMissingTable, supabaseRest } from '@/lib/supabaseRest';

export type ModerationReport = {
  id: number;
  reporter_user_id: string | null;
  target_type: 'user' | 'league' | 'content' | 'bug';
  target_id: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewed' | 'dismissed' | 'resolved';
  created_at: string;
};

export async function createModerationReport(input: Omit<ModerationReport, 'id' | 'status' | 'created_at'>) {
  try {
    await supabaseRest('moderation_reports', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(input),
    });
    return { configured: true };
  } catch (error) {
    if (isMissingTable(error)) return { configured: false };
    throw error;
  }
}

export async function listModerationReports() {
  try {
    return {
      configured: true,
      reports: await supabaseRest<ModerationReport[]>('moderation_reports?select=*&order=created_at.desc&limit=100'),
    };
  } catch (error) {
    if (isMissingTable(error)) return { configured: false, reports: [] };
    throw error;
  }
}
