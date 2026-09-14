import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { isApiResponse } from '@/lib/api-response';
import { verifyAndCompleteVendorOnboarding } from '@/server/marketplace/digio-vendor-onboarding';
import { z } from 'zod';

const completeSchema = z.object({
  digioKycId: z.string().min(1, 'digioKycId is required'),
  verificationToken: z.string().optional(),
  businessDetails: z
    .object({
      businessName: z.string().optional(),
      businessType: z.string().optional(),
      gstNumber: z.string().optional(),
      panCard: z.string().optional(),
      categories: z.array(z.string()).optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      addressLine1: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const body = await request.json().catch(() => ({}));
    const parsed = completeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request payload. digioKycId is required.',
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const updatedProfile = await verifyAndCompleteVendorOnboarding({
      agencyId: session.agencyId,
      digioKycId: parsed.data.digioKycId,
      verificationToken: parsed.data.verificationToken,
      businessDetails: parsed.data.businessDetails,
    });

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });
  } catch (error: any) {
    if (isApiResponse(error)) return error;

    const message = error?.message || 'Verification failed';
    console.error('[API] /api/marketplace/vendor/digio/complete POST error:', message);

    if (message.includes('DIGIO_REQUEST_ID_MISMATCH') || message.includes('DIGIO_IDENTITY_MISMATCH')) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'The provided Digio KYC Request ID does not belong to the authenticated agency.',
        },
        { status: 403 },
      );
    }

    if (message.includes('DIGIO_VERIFICATION_FAILED') || message.includes('MISSING_OR_INVALID_DIGIO_PROOF')) {
      return NextResponse.json(
        {
          success: false,
          error: 'DIGIO_VERIFICATION_REJECTED',
          message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message },
      { status: 500 },
    );
  }
}
