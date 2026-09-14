import { NextRequest, NextResponse } from 'next/server';
import { requireAgencyMembership } from '@/server/auth/session';
import { apiError, isApiResponse } from '@/lib/api-response';
import { createReferral, getPartnerReferrals } from '@/server/referrals/referral.service';
import { isVvisaUid, generateAgencyUid } from '@/lib/uid';
import { db } from '@/lib/db';
import { z } from 'zod';

const createReferralSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  clientName: z.string().min(2, 'Client name is required'),
  clientMobile: z.string().min(8, 'Valid mobile number is required'),
  clientWhatsapp: z.string().optional(),
  clientEmail: z.string().email('Valid email is required'),
  clientCountry: z.string().optional(),
  clientCity: z.string().optional(),
  clientNationality: z.string().optional(),
  clientLanguage: z.string().optional(),
  notes: z.string().optional(),
  consent: z.boolean().default(true),
  travelDate: z.string().optional(),
  numberOfApplicants: z.number().int().min(1).default(1),
  urgency: z.string().optional(),
  passportAvailable: z.boolean().optional(),
  budget: z.string().optional(),
  existingRefusal: z.boolean().optional(),
  attachments: z.any().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const searchParams = request.nextUrl.searchParams;

    const data = await getPartnerReferrals({
      partnerAgencyId: session.agencyId,
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      rewardStatus: searchParams.get('rewardStatus') ?? undefined,
      country: searchParams.get('country') ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API/REFERRALS] GET error:', error);
    return apiError('INVALID_INPUT', 'Failed to fetch referrals', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const body = await request.json();
    const parsed = createReferralSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: parsed.error.issues[0]?.message ?? 'Invalid input' } },
        { status: 400 },
      );
    }

    let partnerUid = session.agency.vvisaUid;
    if (!partnerUid || !isVvisaUid(partnerUid)) {
      partnerUid = generateAgencyUid();
      await db.agency.update({
        where: { id: session.agencyId },
        data: { vvisaUid: partnerUid },
      }).catch(() => {});
    }

    const result = await createReferral({
      ...parsed.data,
      partnerAgencyId: session.agencyId,
      partnerUid,
      actor: session.user.name || session.user.email || 'Partner',
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('[API/REFERRALS] POST error:', error);
    return apiError('INVALID_INPUT', error instanceof Error ? error.message : 'Failed to create referral', 500);
  }
}
