import { NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { getAdminOverview } from '@/server/admin/data';

export async function GET() {
  await requireAdmin('partner.read');
  return NextResponse.json(await getAdminOverview());
}
