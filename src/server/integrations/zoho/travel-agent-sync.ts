import { db } from '@/lib/db';
import { queueZohoCrmEvent } from './crm-outbox';

export async function queueTravelAgentCrmSync(input: {
  agencyId: string;
  eventType?: 'TRAVEL_AGENT_UPSERT' | 'TRAVEL_AGENT_PROFILE_UPDATED';
  idempotencySuffix?: string;
  /** Zoho record ID found during registration's synchronous lookup — skip search if provided */
  existingZohoRecordId?: string;
}) {
  const agency = await db.agency.findUnique({ where: { id: input.agencyId } });
  if (!agency) return { queued: false, reason: 'agency_not_found' as const };

  await queueZohoCrmEvent({
    agencyId: agency.id,
    eventType: input.eventType ?? 'TRAVEL_AGENT_UPSERT',
    entityType: 'Agency',
    entityId: agency.id,
    aggregateId: agency.id,
    idempotencyKey: `travel-agent:${input.eventType ?? 'TRAVEL_AGENT_UPSERT'}:${agency.id}:${input.idempotencySuffix ?? agency.updatedAt.toISOString()}`,
    payloadVersion: 1,
    payload: {
      agencyId: agency.id,
      // Send the VVA UID (not cuid) to Zoho as the portal identifier
      vvisaUid: agency.vvisaUid ?? undefined,
      agencyName: agency.name,
      email: agency.email,
      mobile: agency.phone,
      alternativeNumber: agency.whatsapp,
      gstNumber: agency.gstNumber,
      panCard: agency.panCard,
      city: agency.city,
      state: agency.state,
      country: agency.country,
      postalCode: agency.zipCode,
      addressLine1: agency.addressLine1,
      addressLine2: agency.addressLine2,
      // Use record ID from synchronous lookup if provided, otherwise fall back to stored ID
      existingZohoRecordId: input.existingZohoRecordId ?? agency.zohoRecordId,
    },
  });

  return { queued: true as const };
}

export async function queueTravelAgentActivitySync(input: {
  agencyId: string;
  activityType: 'LOGIN' | 'COUNTRY_SEARCH' | 'PRODUCT_VIEW' | 'PAGE_VIEW' | 'ENGAGEMENT_15S' | 'PAYMENT_COMPLETED';
  description: string;
  country?: string | null;
  product?: string | null;
  page?: string | null;
}) {
  const agency = await db.agency.findUnique({
    where: { id: input.agencyId },
    select: {
      id: true,
      vvisaUid: true,
      name: true,
      email: true,
      zohoRecordId: true,
      loginCount: true,
      lastActiveCountry: true,
      lastSearchedCountry: true,
      lastViewedProduct: true,
      totalVisasSubmitted: true,
      totalRevenueMinor: true,
    },
  });
  if (!agency) return { queued: false, reason: 'agency_not_found' as const };

  const now = new Date();
  await queueZohoCrmEvent({
    agencyId: agency.id,
    eventType: 'TRAVEL_AGENT_ACTIVITY_SYNC',
    entityType: 'Agency',
    entityId: agency.id,
    aggregateId: agency.id,
    idempotencyKey: `travel-agent:activity:${agency.id}:${input.activityType}:${now.toISOString().slice(0, 16)}`,
    payloadVersion: 1,
    payload: {
      agencyId: agency.id,
      vvisaUid: agency.vvisaUid ?? undefined,
      existingZohoRecordId: agency.zohoRecordId,
      activityType: input.activityType,
      description: input.description,
      country: input.country ?? agency.lastSearchedCountry ?? agency.lastActiveCountry,
      product: input.product ?? agency.lastViewedProduct,
      page: input.page,
      loginCount: agency.loginCount,
      totalVisasSubmitted: agency.totalVisasSubmitted,
      totalRevenueMinor: agency.totalRevenueMinor ? String(agency.totalRevenueMinor) : '0',
      timestamp: now.toISOString(),
    },
  });

  return { queued: true as const };
}
