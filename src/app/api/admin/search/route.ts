import { NextRequest, NextResponse } from 'next/server';
import { isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { searchPartners } from '@/server/admin/data';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('partner.read');
    const query = request.nextUrl.searchParams.get('q')?.trim();
    if (!query) return NextResponse.json({ results: [] });
    const partners = await searchPartners(query);
    return NextResponse.json({
      results: partners.map((partner) => ({
        type: 'partner',
        uid: partner.id,
        agencyName: partner.name,
        email: partner.email,
        ownerName: partner.memberships[0]?.user.name ?? null,
        ownerEmail: partner.memberships[0]?.user.email ?? null,
        applicationIds: partner.applications.map((application) => application.id),
        href: `/admin/partners/${partner.id}`,
      })),
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    throw error;
  }
}
