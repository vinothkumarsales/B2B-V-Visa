import { db } from '@/lib/db';
import { queueZohoCrmEvent } from './crm-outbox';

export async function queueTravelAgentCrmSync(input: {
  agencyId: string;
  eventType?: 'TRAVEL_AGENT_UPSERT' | 'TRAVEL_AGENT_PROFILE_UPDATED';
}) {
  const agency = await db.agency.findUnique({ where: { id: input.agencyId } });
  if (!agency) return { queued: false, reason: 'agency_not_found' as const };

  await queueZohoCrmEvent({
    agencyId: agency.id,
    eventType: input.eventType ?? 'TRAVEL_AGENT_UPSERT',
    entityType: 'Agency',
    entityId: agency.id,
    aggregateId: agency.id,
    idempotencyKey: `travel-agent:${input.eventType ?? 'TRAVEL_AGENT_UPSERT'}:${agency.id}`,
    payloadVersion: 1,
    payload: {
      agencyId: agency.id,
      agencyName: agency.name,
      email: agency.email,
      mobile: agency.phone,
      gstNumber: agency.gstNumber,
      panCard: agency.panCard,
      city: agency.city,
      state: agency.state,
      country: agency.country,
      postalCode: agency.zipCode,
      addressLine1: agency.addressLine1,
      addressLine2: agency.addressLine2,
      existingZohoRecordId: agency.zohoRecordId,
    },
  });

  return { queued: true as const };
}
