import { randomUUID } from 'crypto';
import type { IntegrationEvent, IntegrationEventStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { readLocalPrivateDocumentForCrm } from '@/server/storage/private-document-storage';
import { uploadZohoCrmAttachment } from './attachments';
import { isZohoBooksConfigured, syncPaidApplicationToZohoBooks } from './books';
import { buildConfiguredPassportCrmUpdateFields, buildConfiguredTravelAgentCrmFields, buildConfiguredVisaInterestLeadCreateFields, convertZohoCrmLead, createZohoCrmRecord, findZohoCrmRecord, updateZohoCrmRecord } from './record-update';
import { env } from '@/lib/env';
import { queueDocumentAttachmentSync } from './document-attachment-sync';
import { queueDocumentOcrDataSync } from './document-ocr-data-sync';

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

export async function processZohoCrmOutboxEvent(event: ClaimedCrmOutboxEvent) {
  try {
    if (
      event.eventType === 'LEAD_ATTACHMENT_UPLOAD' ||
      event.eventType === 'CONTACT_ATTACHMENT_UPLOAD'
    ) {
      const payload = parseAttachmentPayload(event.payload);
      const bytes = await readLocalPrivateDocumentForCrm(payload.storageKey);
      const result = await uploadZohoCrmAttachment({
        moduleApiName: payload.crmModule,
        recordId: payload.crmRecordId,
        filename: payload.fileName,
        mimeType: payload.mimeType,
        content: bytes,
      });

      await db.documentCrmAttachment.updateMany({
        where: {
          portalDocumentId: payload.portalDocumentId,
          crmModule: payload.crmModule,
          crmRecordId: payload.crmRecordId,
          checksum: payload.checksum,
        },
        data: {
          crmAttachmentId: result.providerAttachmentId,
          syncStatus: 'COMPLETED',
          lastSyncAttemptAt: new Date(),
        },
      });

      return markZohoCrmEventCompleted({
        eventId: event.id,
        providerRecordId: result.providerAttachmentId ?? undefined,
      });
    }

    if (event.eventType === 'TRAVEL_AGENT_UPSERT' || event.eventType === 'TRAVEL_AGENT_PROFILE_UPDATED') {
      const payload = parseTravelAgentPayload(event.payload);
      const fields = buildConfiguredTravelAgentCrmFields({
        portalTravelAgentId: payload.agencyId,
        agencyName: payload.agencyName,
        email: payload.email,
        mobile: payload.mobile,
        alternativeNumber: payload.alternativeNumber,
        gstNumber: payload.gstNumber,
        panCard: payload.panCard,
        city: payload.city,
        state: payload.state,
        country: payload.country,
        postalCode: payload.postalCode,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        portalSource: 'V-Visa B2B Portal',
      });

      if (!env.CRM_WRITE_ENABLED) {
        return markZohoCrmEventManualReview({
          eventId: event.id,
          reasonCode: 'CRM_WRITE_DISABLED',
        });
      }

      const existingMapping = await db.crmEntityMapping.findUnique({
        where: {
          portalEntityType_portalEntityId_zohoModule: {
            portalEntityType: 'Agency',
            portalEntityId: payload.agencyId,
            zohoModule: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
          },
        },
      });
      const matchedByIdentity = !existingMapping && !payload.existingZohoRecordId
        ? await findFirstTravelAgentMatch(payload, 'UID')
        : null;
      const targetZohoRecordId = existingMapping?.zohoRecordId || payload.existingZohoRecordId || matchedByIdentity;
      const result = targetZohoRecordId
        ? await updateZohoCrmRecord({
            moduleApiName: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
            recordId: targetZohoRecordId,
            fields,
          })
        : await createZohoCrmRecord({
            moduleApiName: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
            fields,
          });

      const zohoRecordId = result.providerRecordId || targetZohoRecordId;
      if (!zohoRecordId) throw validationError('ZOHO_TRAVEL_AGENT_ID_MISSING');

      await db.agency.update({
        where: { id: payload.agencyId },
        data: {
          zohoRecordId,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
          syncErrorCode: null,
          syncAttemptCount: { increment: 1 },
        },
      });

      await db.crmEntityMapping.upsert({
        where: {
          portalEntityType_portalEntityId_zohoModule: {
            portalEntityType: 'Agency',
            portalEntityId: payload.agencyId,
            zohoModule: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
          },
        },
        update: {
          zohoRecordId,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
        },
        create: {
          agencyId: event.agencyId,
          portalEntityType: 'Agency',
          portalEntityId: payload.agencyId,
          zohoModule: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE,
          zohoRecordId,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
        },
      });

      return markZohoCrmEventCompleted({
        eventId: event.id,
        providerRecordId: zohoRecordId,
      });
    }

    if (event.eventType === 'VISA_INTEREST_LEAD_CREATE') {
      const payload = parseVisaInterestLeadPayload(event.payload);
      const fields = buildConfiguredVisaInterestLeadCreateFields({
        leadName: payload.applicantName ?? undefined,
        applicantName: payload.applicantName ?? undefined,
        applicantMobile: payload.applicantMobile ?? undefined,
        applicantEmail: payload.applicantEmail ?? undefined,
        countryName: payload.countryName ?? undefined,
        visaTypeName: payload.visaTypeName ?? undefined,
        category: payload.category ?? undefined,
        portalVisaInterestId: payload.visaInterestId,
        leadSource: 'V-Visa B2B Portal',
      });

      if (!env.CRM_WRITE_ENABLED) {
        return markZohoCrmEventManualReview({
          eventId: event.id,
          reasonCode: 'CRM_WRITE_DISABLED',
        });
      }

      const result = await createZohoCrmRecord({
        moduleApiName: env.ZOHO_CRM_LEADS_MODULE,
        fields,
      });

      if (!result.providerRecordId) throw validationError('ZOHO_LEAD_ID_MISSING');

      await db.visaInterest.update({
        where: { id: payload.visaInterestId },
        data: {
          crmLeadId: result.providerRecordId,
          crmSyncStatus: 'COMPLETED',
        },
      });

      await db.crmEntityMapping.upsert({
        where: {
          portalEntityType_portalEntityId_zohoModule: {
            portalEntityType: 'VisaInterest',
            portalEntityId: payload.visaInterestId,
            zohoModule: env.ZOHO_CRM_LEADS_MODULE,
          },
        },
        update: {
          zohoRecordId: result.providerRecordId,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
        },
        create: {
          agencyId: event.agencyId,
          portalEntityType: 'VisaInterest',
          portalEntityId: payload.visaInterestId,
          zohoModule: env.ZOHO_CRM_LEADS_MODULE,
          zohoRecordId: result.providerRecordId,
          syncStatus: 'COMPLETED',
          lastSyncedAt: new Date(),
        },
      });

      return markZohoCrmEventCompleted({
        eventId: event.id,
        providerRecordId: result.providerRecordId,
      });
    }

    if (event.eventType === 'LEAD_CONVERT') {
      if (!env.CRM_WRITE_ENABLED || !env.CRM_PAYMENT_CONVERSION_ENABLED) {
        return markZohoCrmEventManualReview({ eventId: event.id, reasonCode: 'CRM_PAYMENT_CONVERSION_DISABLED' });
      }
      const payload = parseLeadConversionPayload(event.payload);
      const interest = await db.visaInterest.findFirst({
        where: { agencyId: event.agencyId, applicationId: payload.applicationId, crmLeadId: { not: null } },
        orderBy: { updatedAt: 'desc' },
      });
      if (!interest?.crmLeadId) return markZohoCrmEventManualReview({ eventId: event.id, reasonCode: 'CRM_LEAD_MAPPING_MISSING' });
      const converted = await convertZohoCrmLead(interest.crmLeadId);
      await db.$transaction([
        db.visaInterest.update({ where: { id: interest.id }, data: { status: 'CONVERTED', convertedAt: new Date(), crmSyncStatus: 'COMPLETED' } }),
        db.crmEntityMapping.upsert({
          where: { portalEntityType_portalEntityId_zohoModule: { portalEntityType: 'Agency', portalEntityId: event.agencyId, zohoModule: env.ZOHO_CRM_CONTACTS_MODULE } },
          update: { zohoRecordId: converted.contactId, syncStatus: 'COMPLETED', lastSyncedAt: new Date() },
          create: { agencyId: event.agencyId, portalEntityType: 'Agency', portalEntityId: event.agencyId, zohoModule: env.ZOHO_CRM_CONTACTS_MODULE, zohoRecordId: converted.contactId, syncStatus: 'COMPLETED', lastSyncedAt: new Date() },
        }),
        db.crmEntityMapping.upsert({
          where: { portalEntityType_portalEntityId_zohoModule: { portalEntityType: 'VisaInterest', portalEntityId: interest.id, zohoModule: env.ZOHO_CRM_CONTACTS_MODULE } },
          update: { zohoRecordId: converted.contactId, syncStatus: 'COMPLETED', lastSyncedAt: new Date() },
          create: { agencyId: event.agencyId, portalEntityType: 'VisaInterest', portalEntityId: interest.id, zohoModule: env.ZOHO_CRM_CONTACTS_MODULE, zohoRecordId: converted.contactId, syncStatus: 'COMPLETED', lastSyncedAt: new Date() },
        }),
      ]);
      const documents = await db.applicationDocument.findMany({
        where: { agencyId: event.agencyId, applicationId: payload.applicationId },
        include: { ocrExtractions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      for (const document of documents) {
        await queueDocumentAttachmentSync({ agencyId: event.agencyId, documentId: document.id });
        const extraction = document.ocrExtractions[0];
        if (extraction && extraction.normalizedExtraction && typeof extraction.normalizedExtraction === 'object' && !Array.isArray(extraction.normalizedExtraction)) {
          await queueDocumentOcrDataSync({ agencyId: event.agencyId, documentId: document.id, ocrExtractionId: extraction.id, passportFields: Object.fromEntries(Object.entries(extraction.normalizedExtraction as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) });
        }
      }
      return markZohoCrmEventCompleted({ eventId: event.id, providerRecordId: converted.contactId });
    }

    if (event.eventType === 'ZOHO_BOOKS_PAYMENT_SYNC') {
      if (!isZohoBooksConfigured()) {
        return markZohoCrmEventManualReview({
          eventId: event.id,
          reasonCode: 'ZOHO_BOOKS_NOT_CONFIGURED',
        });
      }
      const payload = parseBooksPaymentPayload(event.payload);
      const result = await syncPaidApplicationToZohoBooks({
        agencyId: event.agencyId,
        applicationId: payload.applicationId,
        paymentOrderId: payload.paymentOrderId,
      });
      return markZohoCrmEventCompleted({
        eventId: event.id,
        providerRecordId: result.paymentId ?? result.invoiceId,
        externalRecordId: result.invoiceId,
      });
    }

    if (
      event.eventType === 'LEAD_OCR_DATA_UPDATE' ||
      event.eventType === 'CONTACT_OCR_DATA_UPDATE'
    ) {
      const payload = parseOcrDataPayload(event.payload);
      const updateFields = buildConfiguredPassportCrmUpdateFields({
        module: payload.crmModule,
        passportFields: payload.passportFields,
      });

      if (Object.keys(updateFields).length === 0) {
        return markZohoCrmEventManualReview({
          eventId: event.id,
          reasonCode: `NO_MAPPED_OCR_FIELDS_${payload.crmModule}`,
        });
      }

      const result = await updateZohoCrmRecord({
        moduleApiName: payload.crmModule,
        recordId: payload.crmRecordId,
        fields: updateFields,
      });

      return markZohoCrmEventCompleted({
        eventId: event.id,
        providerRecordId: result.providerRecordId,
      });
    }

    return markZohoCrmEventManualReview({
      eventId: event.id,
      reasonCode: `UNHANDLED_EVENT_TYPE_${event.eventType}`,
    });
  } catch (error) {
    const parsed = classifyWorkerError(error);
    return markZohoCrmEventRetry({
      eventId: event.id,
      attemptCount: event.attemptCount,
      errorCode: parsed.code,
      errorCategory: parsed.category,
    });
  }
}

export async function drainZohoCrmOutbox(maxEvents = 20) {
  const results: Array<{ id: string; status: string }> = [];
  for (let index = 0; index < maxEvents; index += 1) {
    const event = await claimNextZohoCrmEvent();
    if (!event) break;
    const processed = await processZohoCrmOutboxEvent(event);
    results.push({ id: event.id, status: processed.status });
  }
  return results;
}

async function findFirstTravelAgentMatch(payload: TravelAgentPayload, uidField?: string) {
  const phoneVariants = travelAgentPhoneVariants(payload.mobile);
  const candidates = [
    uidField ? { field: uidField, value: payload.agencyId } : null,
    payload.email ? { field: 'Email', value: payload.email.toLowerCase() } : null,
    ...phoneVariants.flatMap((value) => [{ field: 'Phone', value }, { field: 'Mobile', value }]),
    ...travelAgentPhoneVariants(payload.alternativeNumber).flatMap((value) => [{ field: 'Mobile', value }, { field: 'Phone', value }]),
  ].filter((candidate): candidate is { field: string; value: string } => Boolean(candidate));
  for (const candidate of candidates) {
    const recordId = await findZohoCrmRecord({ moduleApiName: env.ZOHO_CRM_TRAVEL_AGENTS_MODULE, ...candidate });
    if (recordId) return recordId;
  }
  return null;
}

function travelAgentPhoneVariants(value?: string | null) {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (!digits) return [];
  const local = digits.length > 10 ? digits.slice(-10) : digits;
  return [...new Set([value?.trim(), local, `+91${local}`, `91${local}`].filter((item): item is string => Boolean(item)))];
}

function sanitizeErrorCode(value: string) {
  return value.replace(/[^A-Z0-9_:-]/gi, '_').slice(0, 120);
}

type AttachmentPayload = {
  crmModule: string;
  crmRecordId: string;
  portalDocumentId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  checksum: string;
};

type TravelAgentPayload = {
  agencyId: string;
  agencyName: string;
  email?: string | null;
  mobile?: string | null;
  alternativeNumber?: string | null;
  gstNumber?: string | null;
  panCard?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  existingZohoRecordId?: string | null;
};
type VisaInterestLeadPayload = {
  visaInterestId: string;
  countryName?: string | null;
  visaTypeName?: string | null;
  category?: string | null;
  applicantName?: string | null;
  applicantMobile?: string | null;
  applicantEmail?: string | null;
};
type OcrDataPayload = {
  crmModule: 'Contacts' | 'Leads';
  crmRecordId: string;
  portalDocumentId: string;
  ocrExtractionId: string;
  passportFields: Record<string, string>;
};
type LeadConversionPayload = { applicationId: string; paymentOrderId: string };
type BooksPaymentPayload = { applicationId?: string | null; paymentOrderId: string };

function parseLeadConversionPayload(value: unknown): LeadConversionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw validationError('INVALID_LEAD_CONVERSION_PAYLOAD');
  const payload = value as Record<string, unknown>;
  if (typeof payload.applicationId !== 'string' || !payload.applicationId) throw validationError('MISSING_APPLICATION_ID');
  if (typeof payload.paymentOrderId !== 'string' || !payload.paymentOrderId) throw validationError('MISSING_PAYMENT_ORDER_ID');
  return { applicationId: payload.applicationId, paymentOrderId: payload.paymentOrderId };
}

function parseBooksPaymentPayload(value: unknown): BooksPaymentPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw validationError('INVALID_BOOKS_PAYMENT_PAYLOAD');
  const payload = value as Record<string, unknown>;
  if (typeof payload.paymentOrderId !== 'string' || !payload.paymentOrderId) throw validationError('MISSING_PAYMENT_ORDER_ID');
  return {
    paymentOrderId: payload.paymentOrderId,
    applicationId: typeof payload.applicationId === 'string' ? payload.applicationId : null,
  };
}

function parseAttachmentPayload(value: unknown): AttachmentPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('INVALID_ATTACHMENT_PAYLOAD');
  }

  const payload = value as Record<string, unknown>;
  const required = [
    'crmModule',
    'crmRecordId',
    'portalDocumentId',
    'storageKey',
    'fileName',
    'mimeType',
    'checksum',
  ] as const;

  for (const key of required) {
    if (typeof payload[key] !== 'string' || !payload[key]) {
      throw validationError(`MISSING_${key.toUpperCase()}`);
    }
  }

  return payload as AttachmentPayload;
}

function parseTravelAgentPayload(value: unknown): TravelAgentPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('INVALID_TRAVEL_AGENT_PAYLOAD');
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.agencyId !== 'string' || !payload.agencyId) {
    throw validationError('MISSING_AGENCY_ID');
  }
  if (typeof payload.agencyName !== 'string' || !payload.agencyName) {
    throw validationError('MISSING_AGENCY_NAME');
  }

  return {
    agencyId: payload.agencyId,
    agencyName: payload.agencyName,
    email: stringOrNull(payload.email),
    mobile: stringOrNull(payload.mobile),
    alternativeNumber: stringOrNull(payload.alternativeNumber),
    gstNumber: stringOrNull(payload.gstNumber),
    panCard: stringOrNull(payload.panCard),
    city: stringOrNull(payload.city),
    state: stringOrNull(payload.state),
    country: stringOrNull(payload.country),
    postalCode: stringOrNull(payload.postalCode),
    addressLine1: stringOrNull(payload.addressLine1),
    addressLine2: stringOrNull(payload.addressLine2),
    existingZohoRecordId: stringOrNull(payload.existingZohoRecordId),
  };
}
function parseVisaInterestLeadPayload(value: unknown): VisaInterestLeadPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('INVALID_VISA_INTEREST_LEAD_PAYLOAD');
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.visaInterestId !== 'string' || !payload.visaInterestId) {
    throw validationError('MISSING_VISA_INTEREST_ID');
  }

  return {
    visaInterestId: payload.visaInterestId,
    countryName: stringOrNull(payload.countryName),
    visaTypeName: stringOrNull(payload.visaTypeName),
    category: stringOrNull(payload.category),
    applicantName: stringOrNull(payload.applicantName),
    applicantMobile: stringOrNull(payload.applicantMobile),
    applicantEmail: stringOrNull(payload.applicantEmail),
  };
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function parseOcrDataPayload(value: unknown): OcrDataPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('INVALID_OCR_DATA_PAYLOAD');
  }

  const payload = value as Record<string, unknown>;
  const crmModule = payload.crmModule;
  if (crmModule !== 'Contacts' && crmModule !== 'Leads') {
    throw validationError('INVALID_OCR_DATA_CRM_MODULE');
  }

  const required = ['crmRecordId', 'portalDocumentId', 'ocrExtractionId'] as const;
  for (const key of required) {
    if (typeof payload[key] !== 'string' || !payload[key]) {
      throw validationError(`MISSING_${key.toUpperCase()}`);
    }
  }

  if (!payload.passportFields || typeof payload.passportFields !== 'object' || Array.isArray(payload.passportFields)) {
    throw validationError('MISSING_PASSPORT_FIELDS');
  }

  return {
    crmModule,
    crmRecordId: payload.crmRecordId as string,
    portalDocumentId: payload.portalDocumentId as string,
    ocrExtractionId: payload.ocrExtractionId as string,
    passportFields: Object.fromEntries(
      Object.entries(payload.passportFields as Record<string, unknown>)
        .filter(([, fieldValue]) => typeof fieldValue === 'string' && fieldValue.trim())
        .map(([fieldKey, fieldValue]) => [fieldKey, String(fieldValue).trim()]),
    ),
  };
}

function validationError(code: string) {
  const error = new Error(code);
  error.name = 'ValidationError';
  return error;
}

function classifyWorkerError(error: unknown): {
  code: string;
  category: 'TRANSIENT' | 'VALIDATION' | 'CONFLICT' | 'PROVIDER' | 'UNKNOWN';
} {
  const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
  if (error instanceof Error && error.name === 'ValidationError') {
    return { code, category: 'VALIDATION' };
  }
  if (error instanceof Error && (error.name === 'ZohoCrmAttachmentError' || error.name === 'ZohoCrmRecordUpdateError')) {
    return { code, category: 'PROVIDER' };
  }
  if (/not found|ENOENT|Invalid storage key/i.test(code)) {
    return { code, category: 'VALIDATION' };
  }
  return { code, category: 'TRANSIENT' };
}
