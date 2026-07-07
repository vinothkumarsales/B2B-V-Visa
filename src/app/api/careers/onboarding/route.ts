import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { careerOnboardingSchema, createOrUpdateCareerOnboarding } from '@/server/careers/onboarding';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = careerOnboardingSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid career onboarding details.', 400);

    const result = await createOrUpdateCareerOnboarding({
      userId: session.user.id,
      userEmail: session.user.email,
      payload: parsed.data,
    });

    return NextResponse.json({
      candidate: result.candidate,
      serviceRequest: result.serviceRequest,
      message: 'Career onboarding saved',
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to save career onboarding.', 400);
  }
}
