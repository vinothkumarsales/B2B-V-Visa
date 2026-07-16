import { db } from '@/lib/db';
import { queueZohoCrmEvent } from './crm-outbox';
import { buildAttachmentIdempotencyKey, checksumFromStorageKey } from './attachment-idempotency';

type AttachmentTarget = {
  module: 'Contacts' | 'Leads';
  recordId: string;
  eventType: 'CONTACT_ATTACHMENT_UPLOAD' | 'LEAD_ATTACHMENT_UPLOAD';
};

export async function queueDocumentAttachmentSync(input: {
  agencyId: string;
  documentId: string;
}) {
  const document = await db.applicationDocument.findFirst({
    where: { id: input.documentId, agencyId: input.agencyId },
    include: {
      application: {
        select: {
          id: true,
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

  const target = await resolveAttachmentTarget({
    agencyId: input.agencyId,
    documentId: document.id,
    applicationId: document.applicationId,
    applicantId: document.applicantId,
    visaInterestId: document.application?.visaInterests[0]?.id,
  });

  if (!target) return { queued: false, reason: 'crm_target_missing' as const };

  const checksum = checksumFromStorageKey(document.storageKey);
  await db.documentCrmAttachment.upsert({
    where: {
      portalDocumentId_crmModule_crmRecordId_checksum: {
        portalDocumentId: document.id,
        crmModule: target.module,
        crmRecordId: target.recordId,
        checksum,
      },
    },
    update: {},
    create: {
      portalDocumentId: document.id,
      crmModule: target.module,
      crmRecordId: target.recordId,
      checksum,
      syncStatus: 'PENDING',
    },
  });

  const idempotencyKey = buildAttachmentIdempotencyKey({
    crmModule: target.module,
    crmRecordId: target.recordId,
    portalDocumentId: document.id,
    checksum,
  });
  await queueZohoCrmEvent({
    agencyId: input.agencyId,
    eventType: target.eventType,
    entityType: 'ApplicationDocument',
    entityId: document.id,
    aggregateId: document.applicationId ?? document.id,
    idempotencyKey,
    payloadVersion: 1,
    payload: {
      crmModule: target.module,
      crmRecordId: target.recordId,
      portalDocumentId: document.id,
      applicationId: document.applicationId,
      applicantId: document.applicantId,
      documentType: document.documentType,
      storageKey: document.storageKey,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      checksum,
    },
  });

  return { queued: true, targetModule: target.module, eventType: target.eventType };
}

async function resolveAttachmentTarget(input: {
  agencyId: string;
  documentId: string;
  applicationId: string | null;
  applicantId: string | null;
  visaInterestId?: string;
}): Promise<AttachmentTarget | null> {
  const contactMapping = input.applicantId
    ? await findMapping(input.agencyId, 'Applicant', input.applicantId, 'Contacts')
    : null;
  if (contactMapping) {
    return {
      module: 'Contacts',
      recordId: contactMapping.zohoRecordId,
      eventType: 'CONTACT_ATTACHMENT_UPLOAD',
    };
  }

  const leadMapping = input.visaInterestId
    ? await findMapping(input.agencyId, 'VisaInterest', input.visaInterestId, 'Leads')
    : null;
  if (leadMapping) {
    return {
      module: 'Leads',
      recordId: leadMapping.zohoRecordId,
      eventType: 'LEAD_ATTACHMENT_UPLOAD',
    };
  }

  const agencyContact = await findMapping(input.agencyId, 'Agency', input.agencyId, 'Contacts');
  if (agencyContact) return { module: 'Contacts', recordId: agencyContact.zohoRecordId, eventType: 'CONTACT_ATTACHMENT_UPLOAD' };

  return null;
}

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
