import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { searchPartners } from '@/server/admin/data';
import { isApiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('partner.read');
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    return NextResponse.json({ partners: await searchPartners(q) });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
