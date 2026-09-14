import { db } from '@/lib/db';
import { queueZohoCrmEvent } from './crm-outbox';
import type { PassportCrmFields, PassportCrmModule } from './record-update';

type OcrDataTarget = {
  module: PassportCrmModule;
  recordId: string;
  eventType: 'CONTACT_OCR_DATA_UPDATE' | 'LEAD_OCR_DATA_UPDATE';
};

export async function queueDocumentOcrDataSync(input: {
  agencyId: string;
  documentId: string;
  ocrExtractionId: string;
  passportFields: Record<string, string>;
}) {
  const document = await db.applicationDocument.findFirst({
    where: { id: input.documentId, agencyId: input.agencyId },
    include: {
      application: {
        select: {
          id: true,
          status: true,
          destination: true,
          visaType: true,
          visaInterests: {
            select: { id: true },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!document) return { queued: false, reason: 'document_not_found' as const };
  if (document.documentType.toLowerCase() !== 'passport') {
    return { queued: false, reason: 'not_passport_document' as const };
  }

  const target = await resolveOcrDataTarget({
    agencyId: input.agencyId,
    applicantId: document.applicantId,
    visaInterestId: document.application?.visaInterests[0]?.id,
  });

  if (!target) return { queued: false, reason: 'crm_target_missing' as const };

  const passportFields = toPassportCrmFields({
    ...input.passportFields,
    documentName: 'Passport',
    serviceRequested: document.application?.visaType ?? undefined,
    destinationCountry: document.application?.destination ?? undefined,
    description: document.application
      ? 'Passport OCR captured for ' + document.application.destination + ' ' + document.application.visaType
      : 'Passport OCR captured from V-Visa B2B portal',
  });
  if (Object.keys(passportFields).length === 0) {
    return { queued: false, reason: 'no_passport_fields' as const };
  }

  await queueZohoCrmEvent({
    agencyId: input.agencyId,
    eventType: target.eventType,
    entityType: 'OcrExtraction',
    entityId: input.ocrExtractionId,
    aggregateId: document.applicationId ?? document.id,
    idempotencyKey: `ocr-data:${target.module}:${target.recordId}:${input.ocrExtractionId}`,
    payloadVersion: 1,
    payload: {
      crmModule: target.module,
      crmRecordId: target.recordId,
      portalDocumentId: document.id,
      ocrExtractionId: input.ocrExtractionId,
      applicationId: document.applicationId,
      applicantId: document.applicantId,
      applicationStatus: document.application?.status ?? null,
      passportFields,
    },
  });

  return { queued: true, targetModule: target.module, eventType: target.eventType };
}

async function resolveOcrDataTarget(input: {
  agencyId: string;
  applicantId: string | null;
  visaInterestId?: string;
}): Promise<OcrDataTarget | null> {
  const contactMapping = input.applicantId
    ? await findMapping(input.agencyId, 'Applicant', input.applicantId, 'Contacts')
    : null;
  if (contactMapping) {
    return {
      module: 'Contacts',
      recordId: contactMapping.zohoRecordId,
      eventType: 'CONTACT_OCR_DATA_UPDATE',
    };
  }

  const leadMapping = input.visaInterestId
    ? await findMapping(input.agencyId, 'VisaInterest', input.visaInterestId, 'Leads')
    : null;
  if (leadMapping) {
    return {
      module: 'Leads',
      recordId: leadMapping.zohoRecordId,
      eventType: 'LEAD_OCR_DATA_UPDATE',
    };
  }

  const agencyContact = await findMapping(input.agencyId, 'Agency', input.agencyId, 'Contacts');
  if (agencyContact) return { module: 'Contacts', recordId: agencyContact.zohoRecordId, eventType: 'CONTACT_OCR_DATA_UPDATE' };

  return null;
}

function toPassportCrmFields(fields: Record<string, string | undefined>): PassportCrmFields {
  return Object.fromEntries(
    Object.entries(fields)
      .filter((entry): entry is [string, string] => {
        const [key, value] = entry;
        return PASSPORT_FIELD_KEYS.has(key) && typeof value === 'string' && Boolean(value.trim());
      })
      .map(([key, value]) => [key, value.trim()]),
  ) as PassportCrmFields;
}

const PASSPORT_FIELD_KEYS = new Set([
  'documentName',
  'passportNumber',
  'description',
  'serviceRequested',
  'firstName',
  'lastName',
  'fatherFirstName',
  'fatherLastName',
  'motherName',
  'nationality',
  'sex',
  'dateOfBirth',
  'dateOfExpiry',
  'destinationCountry',
  'addressLine1',
  'addressLine2',
  'placeOfBirth',
  'placeOfIssue',
  'maritalStatus',
  'dateOfIssue',
]);

function findMapping(
  agencyId: string,
  portalEntityType: string,
  portalEntityId: string,
  zohoModule: string,
) {
  return db.crmEntityMapping.findUnique({
    where: {
      portalEntityType_portalEntityId_zohoModule: {
        portalEntityType,
        portalEntityId,
        zohoModule,
      },
    },
  });
}



