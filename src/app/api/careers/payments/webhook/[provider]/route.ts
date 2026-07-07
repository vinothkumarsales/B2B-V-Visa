import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { processCareerPaymentWebhook } from '@/server/careers/payment-webhook';
import { CareersWebhookVerificationError } from '@/server/careers/payment-webhook-fixture';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return apiError('INVALID_INPUT', 'Unsupported Careers webhook content type.', 415);
    }
    const { provider } = await params;
    const rawBody = await request.text();
    const result = await processCareerPaymentWebhook({
      providerId: provider,
      rawBody,
      headers: request.headers,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isApiResponse(error)) return error;
    if (error instanceof CareersWebhookVerificationError) {
      const code = error.status === 500
        ? 'PRODUCTION_CONFIGURATION_REQUIRED'
        : error.status === 400
          ? 'INVALID_INPUT'
          : 'FORBIDDEN';
      return apiError(code, error.message, error.status);
    }
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to process Careers payment webhook.', 202);
  }
}
