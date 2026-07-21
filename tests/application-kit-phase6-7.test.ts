import assert from 'node:assert/strict';
import test from 'node:test';
import { writeRecruiterEmailDraft, assertMailboxNotSent } from '../src/server/careers/application-kit/mailbox-drafts.ts';
import { isGovernedActionAllowed, assertGovernedActionAllowed, executeGovernedAction } from '../src/server/careers/application-kit/governed-execution.ts';

test('mailbox draft assembles deterministic recruiter email without sending', async () => {
  const draft = await writeRecruiterEmailDraft({
    requestId: 'run-1',
    candidateName: 'Alice',
    jobTitle: 'Engineer',
    company: 'Acme',
    coverLetterMarkdown: 'Dear hiring team,\nI am excited to apply.',
    prohibitedTerms: ['secret', 'confidential'],
  });

  assert.equal(draft.requestId, 'run-1');
  assert.equal(draft.sent, false);
  assert.ok(draft.draft.subject.includes('Alice'));
  assert.ok(draft.draft.body.includes('Acme'));
  assert.equal(draft.draft.prohibitedTermsFound, false);
  assert.ok(draft.draft.raw.includes('Alice'));
});

test('mailbox draft redacts prohibited terms and flags found count', async () => {
  const draft = await writeRecruiterEmailDraft({
    requestId: 'run-2',
    candidateName: 'Bob',
    jobTitle: 'Analyst',
    company: 'Beta Co',
    coverLetterMarkdown: 'This contains secret and confidential information.',
    prohibitedTerms: ['secret', 'confidential'],
  });

  assert.equal(draft.draft.prohibitedTermsFound, true);
  assert.equal(draft.draft.body.includes('secret'), false);
  assert.equal(draft.draft.body.includes('confidential'), false);
  assert.ok(draft.draft.body.includes('[REDACTED]'));
});

test('mailbox assertMailboxNotSent passes when draft.sent is false', async () => {
  const draft = await writeRecruiterEmailDraft({
    requestId: 'run-3',
    candidateName: 'Cara',
    jobTitle: 'Manager',
    company: 'Gamma',
    coverLetterMarkdown: 'Hello',
  });

  const result = await assertMailboxNotSent(draft);
  assert.equal(result.ok, true);
});

test('governed write_artifacts and read_artifacts are allowed; send_recruiter_email is blocked', () => {
  assert.equal(isGovernedActionAllowed('write_artifacts'), true);
  assert.equal(isGovernedActionAllowed('read_artifacts'), true);
  assert.equal(isGovernedActionAllowed('send_recruiter_email'), false);
});

test('governed action executes allowed actions and rejects disabled defaults', async () => {
  const allowed = await executeGovernedAction({ action: 'write_artifacts' });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.executed, true);

  const blocked = await executeGovernedAction({ action: 'send_recruiter_email' });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.executed, false);
  assert.ok(blocked.reason?.includes('disabled'));
});
