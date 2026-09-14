import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { createCareerCheckout } from '@/server/careers/checkout';
import { CAREER_SUPPORTED_CURRENCIES } from '@/server/careers/packages';

const checkoutSchema = z.object({
  serviceRequestId: z.string().min(1),
  packageCode: z.enum(['EUROPE_JOB_SEARCH_ASSIST', 'EUROPE_JOB_SEARCH_PRO', 'EUROPE_JOB_SEARCH_PREMIUM']),
  currency: z.enum(CAREER_SUPPORTED_CURRENCIES).default('INR'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid Careers checkout request.', 400);

    const checkout = await createCareerCheckout({
      userId: session.user.id,
      serviceRequestId: parsed.data.serviceRequestId,
      packageCode: parsed.data.packageCode,
      currency: parsed.data.currency,
    });

    return NextResponse.json(checkout);
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to create Careers checkout.', 503);
  }
}
