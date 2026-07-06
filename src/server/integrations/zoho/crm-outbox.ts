import { db } from '@/lib/db';
import { createHash, randomUUID } from 'crypto';

export async function queueZohoCrmEvent(input: {
  agencyId: string;
  eventType: string;
  idempotencyKey: string;
  payload: unknown;
  entityType?: string;
  entityId?: string;
  aggregateId?: string;
  correlationId?: string;
  payloadVersion?: number;
}) {
  const payloadHash = createHash('sha256')
    .update(JSON.stringify(input.payload))
    .digest('hex');

  return db.integrationEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      agencyId: input.agencyId,
      provider: 'ZOHO_CRM',
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      entityType: input.entityType,
      entityId: input.entityId,
      aggregateId: input.aggregateId,
      correlationId: input.correlationId ?? randomUUID(),
      payloadVersion: input.payloadVersion ?? 1,
      payloadHash,
      payload: input.payload as object,
      status: 'PENDING',
    },
  });
}

export const crmOutboxEventTypes = [
  'TRAVEL_AGENT_UPSERT',
  'TRAVEL_AGENT_PROFILE_UPDATED',
  'VISA_INTEREST_LEAD_CREATE',
  'VISA_INTEREST_LEAD_UPDATE',
  'VISA_INTEREST_TASK_CREATE',
  'LEAD_CONVERT',
  'CONTACT_UPSERT',
  'TRANSACTION_CREATE',
  'TRANSACTION_UPDATE',
  'APPLICATION_SYNC',
  'APPLICATION_STATUS_UPDATE',
  'LEAD_ATTACHMENT_UPLOAD',
  'CONTACT_ATTACHMENT_UPLOAD',
  'CONTACT_ATTACHMENT_RECONCILE',
  'LEAD_OCR_DATA_UPDATE',
  'CONTACT_OCR_DATA_UPDATE',
] as const;
