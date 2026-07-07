import { NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { getApplicationStatusReadModel } from '@/server/admin/read-preview';
import { requireAdminMutation } from '@/server/admin/write-guard';

export async function GET() {
  await requireAdmin('application_status.read');
  const readModel = await getApplicationStatusReadModel();
  return NextResponse.json(readModel);
}

export async function POST() {
  try {
    await requireAdminMutation('application_status.write');
    return apiError('INVALID_ADMIN_MUTATION', 'Application status writes are not available in this phase.', 400);
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
