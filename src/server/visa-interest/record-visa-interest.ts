import type { VisaInterestStatus } from '@prisma/client';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';
import {
  getVisaInterestLeadTiming,
  type VisaInterestIntent,
} from './lead-policy';

export type RecordVisaInterestInput = {
  agencyId: string;
  userId?: string;
  countryCode?: string;
  countryName: string;
  visaTypeId?: string;
  visaTypeName?: string;
  category?: string;
  citizenship?: string;
  travelDate?: string;
  numberOfTravellers?: number;
  applicantName?: string;
  applicantMobile?: string;
  applicantEmail?: string;
  sourceRoute?: string;
  searchSessionId: string;
  intent: VisaInterestIntent;
};

export async function recordVisaInterest(input: RecordVisaInterestInput) {
  const now = new Date();
  const timing = getVisaInterestLeadTiming(input.intent);
  const leadEligibleAt =
    timing === 'IMMEDIATE'
      ? now
      : timing === 'DELAYED'
        ? new Date(now.getTime() + env.CRM_ABANDONED_LEAD_DELAY_MINUTES * 60 * 1000)
        : null;

  const existing = await db.visaInterest.findFirst({
    where: {
      agencyId: input.agencyId,
      searchSessionId: input.searchSessionId,
      countryName: input.countryName,
      visaTypeId: input.visaTypeId ?? null,
      status: {
        notIn: ['PAID', 'CONVERTED', 'EXPIRED', 'CANCELLED'],
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const status = statusForIntent(input.intent);
  const data = {
    userId: input.userId,
    countryCode: input.countryCode,
    countryName: input.countryName,
    visaTypeId: input.visaTypeId,
    visaTypeName: input.visaTypeName,
    category: input.category,
    citizenship: input.citizenship,
    travelDate: input.travelDate ? new Date(input.travelDate) : undefined,
    numberOfTravellers: input.numberOfTravellers,
    applicantName: input.applicantName,
    applicantMobile: input.applicantMobile,
    applicantEmail: input.applicantEmail,
    sourceRoute: input.sourceRoute,
    status,
    lastActivityAt: now,
    leadEligibleAt,
  };

  const interest = existing
    ? await db.visaInterest.update({
        where: { id: existing.id },
        data,
      })
    : await db.visaInterest.create({
        data: {
          agencyId: input.agencyId,
          searchSessionId: input.searchSessionId,
          ...data,
        },
      });

  const shouldQueueLead =
    timing === 'IMMEDIATE' ||
    (timing === 'DELAYED' && env.CRM_ABANDONED_LEAD_ENABLED);

  if (shouldQueueLead && !interest.crmLeadId) {
    await queueZohoCrmEvent({
      agencyId: input.agencyId,
      eventType: 'VISA_INTEREST_LEAD_CREATE',
      entityType: 'VisaInterest',
      entityId: interest.id,
      aggregateId: interest.id,
      idempotencyKey: `visa-lead:${input.agencyId}:${interest.id}`,
      payloadVersion: 1,
      payload: {
        visaInterestId: interest.id,
        leadTiming: timing,
        countryName: interest.countryName,
        visaTypeName: interest.visaTypeName,
        category: interest.category,
        applicantName: interest.applicantName,
        applicantMobilePresent: Boolean(interest.applicantMobile),
        applicantEmailPresent: Boolean(interest.applicantEmail),
        sourceRoute: interest.sourceRoute,
        leadEligibleAt: interest.leadEligibleAt?.toISOString() ?? null,
      },
    });
  }

  return {
    interest,
    leadTiming: timing,
    leadQueued: shouldQueueLead && !interest.crmLeadId,
  };
}

function statusForIntent(intent: VisaInterestIntent): VisaInterestStatus {
  switch (intent) {
    case 'VISA_SELECTED':
      return 'SELECTED';
    case 'CHECKLIST_VIEWED':
      return 'CHECKLIST_VIEWED';
    case 'APPLICATION_STARTED':
    case 'APPLICANT_DETAILS_ENTERED':
      return 'DETAILS_STARTED';
    case 'PAYMENT_INITIATED':
      return 'PAYMENT_STARTED';
    case 'PRICE_VIEWED':
    case 'BROWSE':
    default:
      return 'SEARCHED';
  }
}

