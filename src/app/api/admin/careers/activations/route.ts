import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAdmin } from '@/server/admin/auth';
import { activateCareerServiceFromPayment } from '@/server/careers/activation';

const activationSchema = z.object({
  paymentIntentId: z.string().min(1),
  correlationId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin('application.read');
    const parsed = activationSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid Careers activation request.', 400);

    const result = await activateCareerServiceFromPayment({
      paymentIntentId: parsed.data.paymentIntentId,
      requestedBy: admin.user.id,
      correlationId: parsed.data.correlationId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to activate Careers service.', 503);
  }
}
