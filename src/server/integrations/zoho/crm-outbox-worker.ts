import { randomUUID } from 'crypto';
import type { IntegrationEvent, IntegrationEventStatus } from '@prisma/client';
import { db } from '@/lib/db';

const DEFAULT_LOCK_MS = 5 * 60 * 1000;
const MAX_RETRY_COUNT = 8;

export type ClaimedCrmOutboxEvent = IntegrationEvent & {
  workerId: string;
};

export async function claimNextZohoCrmEvent(input: {
  workerId?: string;
  lockMs?: number;
  now?: Date;
} = {}): Promise<ClaimedCrmOutboxEvent | null> {
  const workerId = input.workerId ?? `crm-worker-${randomUUID()}`;
  const now = input.now ?? new Date();
  const lockExpiry = new Date(now.getTime() - (input.lockMs ?? DEFAULT_LOCK_MS));

  const candidate = await db.integrationEvent.findFirst({
    where: {
      provider: 'ZOHO_CRM',
      OR: [
        { status: 'PENDING' },
        { status: 'RETRY', nextAttemptAt: { lte: now } },
        { status: 'PROCESSING', lockedAt: { lt: lockExpiry } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!candidate) return null;

  const updated = await db.integrationEvent.updateMany({
    where: {
      id: candidate.id,
      OR: [
        { status: 'PENDING' },
        { status: 'RETRY', nextAttemptAt: { lte: now } },
        { status: 'PROCESSING', lockedAt: { lt: lockExpiry } },
      ],
    },
    data: {
      status: 'PROCESSING',
      lockedAt: now,
      lockedBy: workerId,
      lastAttemptedAt: now,
      attemptCount: { increment: 1 },
      syncAttemptCount: { increment: 1 },
    },
  });

  if (updated.count !== 1) return null;

  const event = await db.integrationEvent.findUnique({ where: { id: candidate.id } });
  return event ? { ...event, workerId } : null;
}

export async function markZohoCrmEventCompleted(input: {
  eventId: string;
  providerRecordId?: string;
  externalRecordId?: string;
}) {
  return db.integrationEvent.update({
    where: { id: input.eventId },
    data: {
      status: 'COMPLETED',
      providerRecordId: input.providerRecordId,
      externalRecordId: input.externalRecordId ?? input.providerRecordId,
      completedAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      syncErrorCode: null,
      lastErrorCode: null,
      lastErrorCategory: null,
    },
  });
}

export async function markZohoCrmEventRetry(input: {
  eventId: string;
  attemptCount: number;
  errorCode: string;
  errorCategory: 'TRANSIENT' | 'VALIDATION' | 'CONFLICT' | 'PROVIDER' | 'UNKNOWN';
}) {
  const terminal = input.attemptCount >= MAX_RETRY_COUNT || input.errorCategory === 'VALIDATION';
  const status: IntegrationEventStatus = terminal ? 'FAILED_TERMINAL' : 'RETRY';
  const backoffMinutes = Math.min(2 ** Math.max(input.attemptCount - 1, 0), 60);

  return db.integrationEvent.update({
    where: { id: input.eventId },
    data: {
      status,
      nextAttemptAt: terminal ? null : new Date(Date.now() + backoffMinutes * 60 * 1000),
      lockedAt: null,
      lockedBy: null,
      syncErrorCode: sanitizeErrorCode(input.errorCode),
      lastErrorCode: sanitizeErrorCode(input.errorCode),
      lastErrorCategory: input.errorCategory,
    },
  });
}

export async function markZohoCrmEventManualReview(input: {
  eventId: string;
  reasonCode: string;
}) {
  return db.integrationEvent.update({
    where: { id: input.eventId },
    data: {
      status: 'MANUAL_REVIEW_REQUIRED',
      lockedAt: null,
      lockedBy: null,
      lastErrorCode: sanitizeErrorCode(input.reasonCode),
      lastErrorCategory: 'CONFLICT',
    },
  });
}

function sanitizeErrorCode(value: string) {
  return value.replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 120);
}
