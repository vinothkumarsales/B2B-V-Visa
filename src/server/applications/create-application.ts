import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';
import { queueDocumentAttachmentSync } from '@/server/integrations/zoho/document-attachment-sync';
import { queueDocumentOcrDataSync } from '@/server/integrations/zoho/document-ocr-data-sync';
import { getPrivateDocumentStorage } from '@/server/storage/private-document-storage';
import { recordVisaInterest } from '@/server/visa-interest/record-visa-interest';

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
        passportDocument: z
          .object({
            fileName: z.string().min(1).max(160),
            mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
            contentBase64: z.string().min(20).max(14_000_000),
            providerRequestId: z.string().max(120).optional(),
            confidence: z.enum(['low', 'medium', 'high']).optional(),
            normalizedExtraction: z.record(z.string(), z.string()).optional(),
          })
          .optional(),
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

  for (const [index, applicant] of input.payload.applicants.entries()) {
    if (!applicant.passportDocument) continue;

    const createdApplicant = application.applicants[index];
    if (!createdApplicant) continue;

    const stored = await getPrivateDocumentStorage().upload({
      agencyId: input.agencyId,
      applicationId: application.id,
      applicantId: createdApplicant.id,
      documentType: 'passport',
      originalFilename: applicant.passportDocument.fileName,
      mimeType: applicant.passportDocument.mimeType,
      bytes: Buffer.from(stripDataUrl(applicant.passportDocument.contentBase64), 'base64'),
    });

    const document = await db.applicationDocument.create({
      data: {
        agencyId: input.agencyId,
        applicationId: application.id,
        applicantId: createdApplicant.id,
        documentType: 'passport',
        fileName: stored.safeFilename,
        mimeType: stored.mimeType,
        sizeBytes: stored.fileSize,
        storageKey: stored.storageKey,
        status: applicant.passportDocument.normalizedExtraction ? 'OCR_COMPLETE' : 'UPLOADED',
      },
    });

    if (applicant.passportDocument.normalizedExtraction) {
      const ocrExtraction = await db.ocrExtraction.create({
        data: {
          documentId: document.id,
          provider: 'DIGIO',
          providerRequestId: applicant.passportDocument.providerRequestId,
          rawExtraction: {
            source: 'apply_form_confirmed_vvisa_ai',
            fieldKeys: Object.keys(applicant.passportDocument.normalizedExtraction),
          } as Prisma.InputJsonValue,
          normalizedExtraction: applicant.passportDocument.normalizedExtraction as Prisma.InputJsonValue,
          confidence: applicant.passportDocument.confidence,
        },
      });

      await queueDocumentOcrDataSync({
        agencyId: input.agencyId,
        documentId: document.id,
        ocrExtractionId: ocrExtraction.id,
        passportFields: applicant.passportDocument.normalizedExtraction,
      });
    }

    await queueDocumentAttachmentSync({
      agencyId: input.agencyId,
      documentId: document.id,
    });
  }

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
  } else {
    const recorded = await recordVisaInterest({
      agencyId: input.agencyId,
      userId: input.actorUserId,
      countryCode: visaProduct.destinationCode ?? undefined,
      countryName: visaProduct.destination,
      visaTypeId: visaProduct.id,
      visaTypeName: visaProduct.name,
      category: visaProduct.category,
      sourceRoute: '/apply',
      searchSessionId: `application:${application.id}`,
      intent: 'APPLICATION_STARTED',
    });

    await db.visaInterest.update({
      where: { id: recorded.interest.id },
      data: {
        applicationId: application.id,
        status: 'APPLICATION_CREATED',
        lastActivityAt: new Date(),
      },
    });
  }

  return application;
}

function stripDataUrl(value: string) {
  const marker = ';base64,';
  const index = value.indexOf(marker);
  return index >= 0 ? value.slice(index + marker.length) : value;
}
