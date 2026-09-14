import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';

export async function GET(): Promise<NextResponse> {
  try {
    await requireAdmin('dashboard.read');
    const summary = {
      discoveryEnabled: Boolean(process.env.CAREERS_DISCOVERY_ENABLED),
      fixtureEnabled: Boolean(process.env.CAREERS_FIXTURE_DISCOVERY_ENABLED && process.env.CAREERS_DISCOVERY_ENABLED),
      liveEnabled: Boolean(process.env.CAREERS_LIVE_DISCOVERY_ENABLED && process.env.CAREERS_DISCOVERY_ENABLED),
      firecrawlEnabled: Boolean(process.env.CAREERS_FIRECRAWL_DISCOVERY_ENABLED && process.env.CAREERS_LIVE_DISCOVERY_ENABLED),
      httpCheck: 'ok',
    };

    return NextResponse.json({ ok: true, data: { discovery: summary } });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to load discovery status.' } }, { status: 503 });
  }
}

function isAdminApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
