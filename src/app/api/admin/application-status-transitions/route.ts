import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { getApplicationStatusReadModel } from '@/server/admin/read-preview';

export async function GET() {
  await requireAdmin('application_status.read');
  const readModel = await getApplicationStatusReadModel();
  return NextResponse.json({ transitions: readModel.transitions });
}
