import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { searchPartners } from '@/server/admin/data';

export async function GET(request: NextRequest) {
  await requireAdmin('partner.read');
  const q = request.nextUrl.searchParams.get('q') ?? undefined;
  return NextResponse.json({ partners: await searchPartners(q) });
}
