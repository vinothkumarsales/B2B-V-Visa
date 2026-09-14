import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import { createVendorOnboardingSession } from '@/server/marketplace/digio-vendor-onboarding';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();

    const agency = await db.agency.findUnique({
      where: { id: session.agencyId },
    });

    if (!agency) {
      return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    const digioSession = await createVendorOnboardingSession({
      agencyId: agency.id,
      userId: session.user.id,
      businessName: agency.name,
      contactPerson: session.user.name || agency.name,
      contactEmail: agency.email,
      contactPhone: agency.phone || undefined,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      session: digioSession,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/vendor/digio/start POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to start vendor onboarding session' }, { status: 500 });
  }
}
