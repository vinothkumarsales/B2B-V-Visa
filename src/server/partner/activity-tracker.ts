import { db } from '@/lib/db';
import { auditLog } from '@/server/audit/audit-log';
import { queueTravelAgentActivitySync } from '@/server/integrations/zoho/travel-agent-sync';
import { recordVisaInterest } from '@/server/visa-interest/record-visa-interest';

export type PortalActivityInput = {
  agencyId: string;
  userId?: string;
  eventType:
    | 'PAGE_VIEW'
    | 'COUNTRY_SEARCH'
    | 'VISA_PRODUCT_VIEW'
    | '15S_ENGAGEMENT_QUALIFIED';
  country?: string;
  countryCode?: string;
  product?: string;
  visaTypeId?: string;
  page?: string;
  searchSessionId?: string;
  activeSeconds?: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordPortalActivity(input: PortalActivityInput) {
  const now = new Date();

  // 1. Update Agency master record with latest behavioral context
  const updateData: Record<string, unknown> = {
    lastActiveAt: now,
  };
  if (input.page) updateData.lastActivePage = input.page;
  if (input.country) {
    updateData.lastActiveCountry = input.country;
    if (input.eventType === 'COUNTRY_SEARCH') {
      updateData.lastSearchedCountry = input.country;
    }
  }
  if (input.product && input.eventType === 'VISA_PRODUCT_VIEW') {
    updateData.lastViewedProduct = input.product;
  }

  const agency = await db.agency.update({
    where: { id: input.agencyId },
    data: updateData,
    select: {
      id: true,
      vvisaUid: true,
      name: true,
      email: true,
      phone: true,
      lastSearchedCountry: true,
      lastViewedProduct: true,
    },
  });

  // 2. Write to AuditLog (permanent behavioral history)
  await auditLog({
    agencyId: input.agencyId,
    actorUserId: input.userId,
    action: input.eventType,
    resourceType: 'PortalActivity',
    resourceId: input.country || input.product || input.page || input.agencyId,
    metadata: {
      vvisaUid: agency.vvisaUid,
      country: input.country,
      product: input.product,
      page: input.page,
      activeSeconds: input.activeSeconds,
      searchSessionId: input.searchSessionId,
      ...input.metadata,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  // 3. Handle 15-second meaningful engagement -> Lead Creation with Deduplication
  let leadCreated = false;
  if (input.eventType === '15S_ENGAGEMENT_QUALIFIED') {
    const targetCountry = input.country || agency.lastSearchedCountry || 'General Enquiry';
    const targetProduct = input.product || agency.lastViewedProduct || 'Visa Consultation';

    // Deduplication check: Has a lead been created for this agency + country/session recently?
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingInterest = await db.visaInterest.findFirst({
      where: {
        agencyId: input.agencyId,
        countryName: targetCountry,
        createdAt: { gte: oneDayAgo },
        status: { notIn: ['CANCELLED', 'EXPIRED'] },
      },
    });

    if (!existingInterest || !existingInterest.crmLeadId) {
      const sessionId = input.searchSessionId || `session-${input.agencyId}-${Date.now()}`;
      try {
        await recordVisaInterest({
          agencyId: input.agencyId,
          userId: input.userId,
          countryName: targetCountry,
          countryCode: input.countryCode,
          visaTypeId: input.visaTypeId,
          visaTypeName: targetProduct,
          searchSessionId: sessionId,
          intent: 'PRICE_VIEWED',
          sourceRoute: input.page || '/explore',
        });
        leadCreated = true;
      } catch (err) {
        console.warn('[PORTAL_ACTIVITY] Lead generation non-fatal error:', err);
      }
    }
  }

  // 4. Meaningful updates to Zoho Travel Agent master record
  let syncDescription = `Portal activity: ${input.eventType}`;
  if (input.eventType === 'COUNTRY_SEARCH' && input.country) {
    syncDescription = `Searched country: ${input.country}`;
  } else if (input.eventType === 'VISA_PRODUCT_VIEW' && input.product) {
    syncDescription = `Viewed visa product: ${input.product} (${input.country ?? 'Unknown'})`;
  } else if (input.eventType === '15S_ENGAGEMENT_QUALIFIED') {
    syncDescription = `Actively engaged in portal (>15s on ${input.page ?? 'dashboard'})`;
  }

  await queueTravelAgentActivitySync({
    agencyId: input.agencyId,
    activityType:
      input.eventType === 'COUNTRY_SEARCH'
        ? 'COUNTRY_SEARCH'
        : input.eventType === 'VISA_PRODUCT_VIEW'
          ? 'PRODUCT_VIEW'
          : input.eventType === '15S_ENGAGEMENT_QUALIFIED'
            ? 'ENGAGEMENT_15S'
            : 'PAGE_VIEW',
    description: syncDescription,
    country: input.country,
    product: input.product,
    page: input.page,
  });

  return { success: true, leadCreated };
}
