import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAgencyMembership } from '@/server/auth/session';
import { recordPortalActivity } from '@/server/partner/activity-tracker';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';
import { headers } from 'next/headers';
import { after } from 'next/server';

const activitySchema = z.object({
  eventType: z.enum([
    'PAGE_VIEW',
    'COUNTRY_SEARCH',
    'VISA_PRODUCT_VIEW',
    '15S_ENGAGEMENT_QUALIFIED',
  ]),
  country: z.string().max(120).optional(),
  countryCode: z.string().max(8).optional(),
  product: z.string().max(160).optional(),
  visaTypeId: z.string().max(120).optional(),
  page: z.string().max(160).optional(),
  searchSessionId: z.string().max(160).optional(),
  activeSeconds: z.number().int().min(0).max(86400).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAgencyMembership();
    const parsed = activitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Invalid activity data', 400);
    }

    const headerStore = await headers();
    const ipAddress = headerStore.get('x-forwarded-for') ?? headerStore.get('x-real-ip') ?? null;
    const userAgent = headerStore.get('user-agent') ?? null;

    const result = await recordPortalActivity({
      ...parsed.data,
      agencyId: session.agencyId,
      userId: session.user.id,
      ipAddress,
      userAgent,
    });

    // Asynchronously trigger outbox worker drain (non-blocking)
    after(async () => {
      try {
        await drainZohoCrmOutbox(3);
      } catch (e) {
        console.warn('[PORTAL_ACTIVITY] Background CRM drain non-fatal error:', e);
      }
    });

    return NextResponse.json({
      success: true,
      leadCreated: result.leadCreated,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    console.error('PORTAL_ACTIVITY_ERROR', error);
    return apiError('INVALID_INPUT', 'Failed to record activity', 400);
  }
}
