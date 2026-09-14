import { createHash } from 'node:crypto';

export function buildAttachmentIdempotencyKey(input: {
  crmModule: string;
  crmRecordId: string;
  portalDocumentId: string;
  checksum: string;
}) {
  return `attachment:${input.crmModule}:${input.crmRecordId}:${input.portalDocumentId}:${input.checksum}`;
}

export function checksumFromStorageKey(storageKey: string) {
  return createHash('sha256').update(storageKey).digest('hex');
}
