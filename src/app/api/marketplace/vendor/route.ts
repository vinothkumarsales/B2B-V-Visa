import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import { getVendorProfile, getVendorKycStatus, updateVendorProfile } from '@/server/marketplace/vendor.service';
import { z } from 'zod';

const updateProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  businessType: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  panCard: z.string().optional(),
  categories: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await requireAgencyMembership();
    const [kycSummary, fullProfile] = await Promise.all([
      getVendorKycStatus(session.agencyId),
      getVendorProfile(session.agencyId),
    ]);

    return NextResponse.json({
      success: true,
      ...kycSummary,
      profile: fullProfile,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/vendor GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await updateVendorProfile(session.agencyId, parsed.data);
    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API] /api/marketplace/vendor PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

