import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { approveSubmission, executeApprovedSubmission, prepareSubmissionPreview } from '../src/server/careers/application-submission.service.ts';

test('application submission requires immutable approval, feature gates, evidence, and prevents duplicates', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'careers-submit-'));
  process.env.WORKSPACES_DIR = root;
  const runId = 'RUN-001';
  const kit = path.join(root, runId, 'application-kit');
  await fs.mkdir(kit, { recursive: true });
  await fs.writeFile(path.join(kit, 'tailored-cv.md'), 'cv');
  await fs.writeFile(path.join(kit, 'cover-letter.md'), 'cover');
  await fs.writeFile(path.join(kit, 'application-answers.json'), '{}');

  const preview = await prepareSubmissionPreview({ runId, candidateId: 'CAND-001', externalJobId: 'GH-001', jobUrl: 'https://boards.greenhouse.io/example/jobs/1' });
  assert.equal(preview.status, 'approval_required');
  const approved = await approveSubmission({ runId, idempotencyKey: preview.idempotencyKey, previewHash: preview.previewHash, actorId: 'ADMIN-1' });
  assert.equal(approved.status, 'approved_for_submission');

  process.env.CAREERS_SAAS_ENABLED = 'true';
  process.env.CAREERS_BROWSER_EXECUTION_ENABLED = 'true';
  process.env.CAREERS_AUTO_SUBMIT_ENABLED = 'true';
  const submitted = await executeApprovedSubmission({ runId, idempotencyKey: preview.idempotencyKey, executor: async () => ({ confirmationId: 'CONF-1', confirmationUrl: 'https://boards.greenhouse.io/example/confirmation/1', submittedAt: new Date().toISOString() }) });
  assert.equal(submitted.status, 'submitted');
  const duplicate = await executeApprovedSubmission({ runId, idempotencyKey: preview.idempotencyKey, executor: async () => { throw new Error('must not execute'); } });
  assert.equal(duplicate.duplicatePrevented, true);
});
