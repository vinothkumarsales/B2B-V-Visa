import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { careersFeatureEnabled } from '@/server/careers/feature-flags';
import { performHealthCheck } from '@/server/careers/connections.service';

export async function GET(_request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_INTERNAL_CONSOLE_ENABLED')) {
      return apiError('FORBIDDEN', 'Connections are currently disabled.', 403);
    }

    await requireSession();
    return await performHealthCheck((await context.params).provider);
  } catch (error) {
    if (isApiResponse(error)) return error as NextResponse;
    return apiError('PROVIDER_UNAVAILABLE', 'Connection health check failed.', 503);
  }
}

export const POST = GET;
