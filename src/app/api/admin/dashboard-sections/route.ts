import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { getDashboardSections } from '@/server/admin/read-preview';
import { requireAdminMutation } from '@/server/admin/write-guard';

export async function GET() {
  try {
    await requireAdmin('dashboard.read');
    return NextResponse.json({ sections: await getDashboardSections() });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}

export async function POST() {
  try {
    await requireAdminMutation('dashboard.write');
    return apiError('INVALID_ADMIN_MUTATION', 'Dashboard writes are not available in this phase.', 400);
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
