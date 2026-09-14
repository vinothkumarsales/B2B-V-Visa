import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAttachmentIdempotencyKey,
  checksumFromStorageKey,
} from '../src/server/integrations/zoho/attachment-idempotency.ts';

test('builds deterministic CRM attachment idempotency keys', () => {
  const checksum = checksumFromStorageKey('documents/agency/applicant/passport-front.jpg');
  const key = buildAttachmentIdempotencyKey({
    crmModule: 'Leads',
    crmRecordId: '1234567890',
    portalDocumentId: 'doc_123',
    checksum,
  });

  assert.equal(
    key,
    `attachment:Leads:1234567890:doc_123:${checksum}`,
  );
  assert.equal(checksum.length, 64);
});
