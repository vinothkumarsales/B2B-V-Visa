import { NextResponse } from 'next/server';
import { isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { getApplicationStatusReadModel } from '@/server/admin/read-preview';

export async function GET() {
  try {
    await requireAdmin('application_status.read');
    const readModel = await getApplicationStatusReadModel();
    return NextResponse.json({ transitions: readModel.transitions });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
