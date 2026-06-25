import { db } from '@/lib/db';

export async function queueZohoCrmEvent(input: {
  agencyId: string;
  eventType: string;
  idempotencyKey: string;
  payload: unknown;
}) {
  return db.integrationEvent.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      agencyId: input.agencyId,
      provider: 'ZOHO_CRM',
      eventType: input.eventType,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload as object,
    },
  });
}
