import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireAgencyMembership } from '@/server/auth/session';
import { drainZohoCrmOutbox } from '@/server/integrations/zoho/crm-outbox-worker';
import type { VisaInterestIntent } from '@/server/visa-interest/lead-policy';
import { recordVisaInterest } from '@/server/visa-interest/record-visa-interest';

const productIntentSchema = z.object({
  eventType: z.enum([
    'COUNTRY_CARD_CLICKED',
    'VISA_PRODUCT_CLICKED',
    'PRODUCT_OPENED',
    'PRODUCT_ENGAGED_3_MIN',
    'APPLICATION_STARTED',
    'DOCUMENT_UPLOADED',
    'PAYMENT_SCREEN_OPENED',
    'PAYMENT_ABANDONED',
  ]),
  country: z.string().min(1).max(120),
  countryCode: z.string().max(8).optional(),
  productId: z.string().max(120).optional(),
  productName: z.string().max(160).optional(),
  category: z.string().max(80).optional(),
  sourcePage: z.string().max(160).optional(),
  searchSessionId: z.string().min(8).max(180).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = productIntentSchema.safeParse(await request.json());
    if (!parsed.success) return apiError('INVALID_INPUT', 'Invalid product intent payload', 400);

    const session = await requireAgencyMembership();
    const eventDay = new Date().toISOString().slice(0, 10);
    const searchSessionId =
      parsed.data.searchSessionId ??
      `intent:${session.user.id}:${parsed.data.eventType}:${parsed.data.productId ?? parsed.data.country}:${eventDay}`;

    const result = await recordVisaInterest({
      agencyId: session.agencyId,
      userId: session.user.id,
      countryCode: parsed.data.countryCode,
      countryName: parsed.data.country,
      visaTypeId: parsed.data.productId,
      visaTypeName: parsed.data.productName,
      category: parsed.data.category,
      sourceRoute: parsed.data.sourcePage,
      searchSessionId,
      intent: intentForEvent(parsed.data.eventType),
    });

    if (result.leadQueued) {
      after(async () => {
        try {
          await drainZohoCrmOutbox(5);
        } catch (error) {
          console.error('CRM_PRODUCT_INTENT_DRAIN_FAILED', error instanceof Error ? error.message : 'CRM drain failed');
        }
      });
    }

    return NextResponse.json({
      success: true,
      visaInterestId: result.interest.id,
      status: result.interest.status,
      leadQueued: result.leadQueued,
    });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('PROVIDER_UNAVAILABLE', 'Unable to record product intent', 503);
  }
}

function intentForEvent(eventType: z.infer<typeof productIntentSchema>['eventType']): VisaInterestIntent {
  switch (eventType) {
    case 'COUNTRY_CARD_CLICKED':
    case 'PRODUCT_OPENED':
    case 'PRODUCT_ENGAGED_3_MIN':
      return 'BROWSE';
    case 'PAYMENT_SCREEN_OPENED':
    case 'PAYMENT_ABANDONED':
      return 'PAYMENT_INITIATED';
    case 'APPLICATION_STARTED':
      return 'APPLICATION_STARTED';
    case 'DOCUMENT_UPLOADED':
      return 'APPLICANT_DETAILS_ENTERED';
    case 'VISA_PRODUCT_CLICKED':
    default:
      return 'VISA_SELECTED';
  }
}
