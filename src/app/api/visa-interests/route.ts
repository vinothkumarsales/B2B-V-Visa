import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAgencyMembership } from '@/server/auth/session';
import { recordVisaInterest } from '@/server/visa-interest/record-visa-interest';

const visaInterestSchema = z.object({
  countryCode: z.string().max(8).optional(),
  countryName: z.string().min(1).max(120),
  visaTypeId: z.string().max(120).optional(),
  visaTypeName: z.string().max(160).optional(),
  category: z.string().max(80).optional(),
  citizenship: z.string().max(80).optional(),
  travelDate: z.string().max(40).optional(),
  numberOfTravellers: z.number().int().min(1).max(50).optional(),
  applicantName: z.string().max(160).optional(),
  applicantMobile: z.string().max(40).optional(),
  applicantEmail: z.string().email().optional(),
  sourceRoute: z.string().max(120).optional(),
  searchSessionId: z.string().min(8).max(160),
  intent: z.enum([
    'BROWSE',
    'VISA_SELECTED',
    'PRICE_VIEWED',
    'CHECKLIST_VIEWED',
    'APPLICATION_STARTED',
    'APPLICANT_DETAILS_ENTERED',
    'PAYMENT_INITIATED',
  ]),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = visaInterestSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid visa interest payload', 400);

    const session = await requireAgencyMembership();
    const result = await recordVisaInterest({
      ...parsed.data,
      agencyId: session.agencyId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      visaInterestId: result.interest.id,
      status: result.interest.status,
      leadTiming: result.leadTiming,
      leadQueued: result.leadQueued,
      leadEligibleAt: result.interest.leadEligibleAt,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to record visa interest', 503);
  }
}
