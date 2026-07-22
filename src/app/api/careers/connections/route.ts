import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { careersFeatureEnabled } from '@/server/careers/feature-flags';
import { listConnections } from '@/server/careers/connections.service';

export async function GET() {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_INTERNAL_CONSOLE_ENABLED')) {
      return apiError('FORBIDDEN', 'Connections are currently disabled.', 403);
    }

    await requireSession();
    return listConnections();
  } catch (error) {
    if (isApiResponse(error)) return error as NextResponse;
    return apiError('INVALID_INPUT', 'Unable to load connection providers.', 400);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_INTERNAL_CONSOLE_ENABLED')) {
      return apiError('FORBIDDEN', 'Connections are currently disabled.', 403);
    }

    await requireSession();
    const body = await request.json().catch(() => ({}));
    const provider = String(body?.provider ?? '').trim().toLowerCase();

    if (!provider) {
      return apiError('INVALID_INPUT', 'provider is required', 400);
    }

    if (!['mail', 'linkedin'].includes(provider)) {
      return apiError('INVALID_INPUT', 'Unsupported provider. Use mail or linkedin.', 400);
    }

    const origin = request.nextUrl.origin;
    // @todo replace with real OAuth authorize flow using env client id/secret and state/nonce.
    const authorizeUrl = `/api/careers/connections/${provider}/authorize?origin=${encodeURIComponent(origin)}`;

    return NextResponse.json({ ok: true, data: { action: 'authorize', provider, authorizeUrl } }, { status: 202 });
  } catch (error) {
    if (isApiResponse(error)) return error as NextResponse;
    return apiError('INVALID_INPUT', 'Unable to initiate connection.', 400);
  }
}
