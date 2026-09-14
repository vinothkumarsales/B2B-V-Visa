import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { apiError } from '@/lib/api-response';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return apiError('PRODUCTION_CONFIGURATION_REQUIRED', 'CRM worker authentication is not configured.', 503);
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return apiError('FORBIDDEN', 'Invalid worker authorization.', 403);
  if (!env.CRM_SYNC_ENABLED) return NextResponse.json({ processed: 0, disabled: true });
  const results = await drainZohoCrmOutbox(20);
  return NextResponse.json({ processed: results.length, statuses: results.reduce<Record<string, number>>((counts, result) => ({ ...counts, [result.status]: (counts[result.status] ?? 0) + 1 }), {}) });
}
