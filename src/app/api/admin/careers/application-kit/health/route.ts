import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';

export async function GET() {
  try {
    await requireAdmin('application.read');
    return NextResponse.json({ ok: true, data: { status: 'ok', phase: '4A-7', endpoints: ['GET /api/admin/careers/application-kit', 'POST /api/admin/careers/application-kit', 'GET /api/admin/careers/application-kit/console', 'GET /api/admin/careers/application-kit/recruiter-email'] } });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to verify application-kit health.' } }, { status: 503 });
  }
}

function isAdminApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
