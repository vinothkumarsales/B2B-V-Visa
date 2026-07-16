import { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';

export const createApplicationSchema = z.object({
  visaProductId: z.string().min(1),
  internalId: z.string().max(80).optional(),
  applicants: z
    .array(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        passportNumber: z.string().min(3),
        nationality: z.string().default('Indian'),
        sex: z.string().optional(),
        dateOfBirth: z.string().optional(),
        placeOfBirth: z.string().optional(),
        placeOfIssue: z.string().optional(),
        maritalStatus: z.string().optional(),
        dateOfIssue: z.string().optional(),
        dateOfExpiry: z.string().optional(),
        isChild: z.boolean().default(false),
      })
    )
    .min(1)
    .max(1, 'First production slice supports individual applications only'),
});

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function createIndividualApplication(input: {
  agencyId: string;
  actorUserId: string;
  payload: z.infer<typeof createApplicationSchema>;
}) {
  const visaProduct = await db.visaProduct.findFirst({
    where: {
      id: input.payload.visaProductId,
      isActive: true,
      OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
    },
  });

  if (!visaProduct) {
    throw apiError('RESOURCE_NOT_FOUND', 'Visa product not found', 404);
  }

  const totalAmountMinor = visaProduct.amountMinor * input.payload.applicants.length;
  const pricingSnapshot = {
    visaProductId: visaProduct.id,
    pricingVersion: visaProduct.pricingVersion,
    currency: visaProduct.currency,
    amountMinor: visaProduct.amountMinor,
    totalAmountMinor,
    capturedAt: new Date().toISOString(),
  };

  const application = await db.visaApplication.create({
    data: {
      agencyId: input.agencyId,
      visaProductId: visaProduct.id,
      internalId: input.payload.internalId,
      destination: visaProduct.destination,
      visaType: visaProduct.name,
      status: 'DOCUMENTS_PENDING',
      pricingSnapshot,
      totalAmountMinor,
      currency: visaProduct.currency,
      applicants: {
        create: input.payload.applicants.map((applicant) => ({
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          passportNumber: applicant.passportNumber,
          nationality: applicant.nationality,
          sex: applicant.sex,
          dateOfBirth: parseOptionalDate(applicant.dateOfBirth),
          placeOfBirth: applicant.placeOfBirth,
          placeOfIssue: applicant.placeOfIssue,
          maritalStatus: applicant.maritalStatus,
          dateOfIssue: parseOptionalDate(applicant.dateOfIssue),
          dateOfExpiry: parseOptionalDate(applicant.dateOfExpiry),
          isChild: applicant.isChild,
        })),
      },
      statusEvents: {
        create: {
          nextStatus: 'DOCUMENTS_PENDING',
          actorUserId: input.actorUserId,
          reason: 'Application created from B2B portal',
        },
      },
    },
    include: { applicants: true },
  });

  await auditLog({
    agencyId: input.agencyId,
    actorUserId: input.actorUserId,
    action: 'APPLICATION_CREATED',
    resourceType: 'VisaApplication',
    resourceId: application.id,
    metadata: { visaProductId: visaProduct.id, totalAmountMinor },
  });

  await queueZohoCrmEvent({
    agencyId: input.agencyId,
    eventType: 'APPLICATION_SYNC',
    idempotencyKey: `zoho-crm:application-created:${application.id}`,
    entityType: 'VisaApplication',
    entityId: application.id,
    aggregateId: application.id,
    payload: { applicationId: application.id, agencyId: input.agencyId },
  });

  const interest = await db.visaInterest.findFirst({
    where: {
      agencyId: input.agencyId,
      visaTypeId: visaProduct.id,
      status: { notIn: ['PAID', 'CONVERTED', 'EXPIRED', 'CANCELLED'] },
    },
    orderBy: { lastActivityAt: 'desc' },
  });

  if (interest) {
    await db.visaInterest.update({
      where: { id: interest.id },
      data: {
        applicationId: application.id,
        status: 'APPLICATION_CREATED',
        lastActivityAt: new Date(),
      },
    });
  }

  return application;
}
