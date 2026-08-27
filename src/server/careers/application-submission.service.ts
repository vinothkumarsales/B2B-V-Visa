import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { careersFeatureEnabled } from './feature-flags.ts';

export type SubmissionEvidence = { confirmationId: string; confirmationUrl: string; submittedAt: string };
export type SubmissionExecutor = (input: { jobUrl: string; runId: string; idempotencyKey: string }) => Promise<SubmissionEvidence>;
export type SubmissionRecord = {
  version: 1;
  runId: string;
  candidateId: string;
  externalJobId: string;
  jobUrl: string;
  adapter: 'greenhouse';
  idempotencyKey: string;
  previewHash: string;
  artifacts: Array<{ relativePath: string; sha256: string }>;
  status: 'approval_required' | 'approved_for_submission' | 'submitted';
  approval: null | { actorId: string; scope: 'application.submit'; previewHash: string; approvedAt: string };
  submission: SubmissionEvidence | null;
  createdAt: string;
  updatedAt: string;
};

export async function prepareSubmissionPreview(input: { runId: string; candidateId: string; externalJobId: string; jobUrl: string }): Promise<SubmissionRecord> {
  const runId = safeId(input.runId, 'runId');
  const candidateId = safeId(input.candidateId, 'candidateId');
  const externalJobId = safeId(input.externalJobId, 'externalJobId');
  assertGreenhouseUrl(input.jobUrl);
  const artifacts = await approvedArtifacts(runId);
  const idempotencyKey = hash([candidateId, externalJobId, input.jobUrl].join('|'));
  const existing = await readSubmissionRecord(runId, idempotencyKey);
  if (existing?.status === 'submitted') return existing;
  const previewHash = hash(JSON.stringify({ candidateId, externalJobId, jobUrl: input.jobUrl, artifacts }));
  const now = new Date().toISOString();
  const record: SubmissionRecord = {
    version: 1,
    runId,
    candidateId,
    externalJobId,
    jobUrl: input.jobUrl,
    adapter: 'greenhouse',
    idempotencyKey,
    previewHash,
    artifacts,
    status: 'approval_required',
    approval: null,
    submission: null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await writeRecord(record);
  return record;
}

export async function approveSubmission(input: { runId: string; idempotencyKey: string; previewHash: string; actorId: string }): Promise<SubmissionRecord> {
  const record = await requireRecord(input.runId, input.idempotencyKey);
  if (record.status === 'submitted') return record;
  if (record.previewHash !== input.previewHash) throw coded('APPLICATION_PREVIEW_CHANGED', 409);
  if (!String(input.actorId || '').trim()) throw coded('APPROVAL_ACTOR_REQUIRED', 400);
  record.approval = { actorId: input.actorId, scope: 'application.submit', previewHash: record.previewHash, approvedAt: new Date().toISOString() };
  record.status = 'approved_for_submission';
  record.updatedAt = new Date().toISOString();
  await writeRecord(record);
  return record;
}

export async function executeApprovedSubmission(input: { runId: string; idempotencyKey: string; executor?: SubmissionExecutor }): Promise<SubmissionRecord & { duplicatePrevented?: boolean }> {
  const record = await requireRecord(input.runId, input.idempotencyKey);
  if (record.status === 'submitted') return { ...record, duplicatePrevented: true };
  if (record.status !== 'approved_for_submission' || !record.approval) throw coded('APPLICATION_APPROVAL_REQUIRED', 409);
  if (record.approval.previewHash !== record.previewHash) throw coded('APPLICATION_APPROVAL_STALE', 409);
  if (!browserSubmissionEnabled()) throw coded('LIVE_APPLICATION_SUBMISSION_DISABLED', 409);
  if (!input.executor) throw coded('PORTAL_EXECUTOR_UNAVAILABLE', 503);
  const evidence = await input.executor({ jobUrl: record.jobUrl, runId: record.runId, idempotencyKey: record.idempotencyKey });
  validateEvidence(evidence);
  record.status = 'submitted';
  record.submission = evidence;
  record.updatedAt = new Date().toISOString();
  await writeRecord(record);
  return record;
}

export async function readSubmissionRecord(runId: string, idempotencyKey: string): Promise<SubmissionRecord | null> {
  try { return JSON.parse(await fs.readFile(recordPath(runId, idempotencyKey), 'utf8')) as SubmissionRecord; } catch { return null; }
}

export function browserSubmissionEnabled() {
  return careersFeatureEnabled('CAREERS_SAAS_ENABLED') && careersFeatureEnabled('CAREERS_BROWSER_EXECUTION_ENABLED') && careersFeatureEnabled('CAREERS_AUTO_SUBMIT_ENABLED');
}

async function approvedArtifacts(runId: string) {
  const base = applicationKitDir(runId);
  const files = ['tailored-cv.md', 'cover-letter.md', 'application-answers.json'];
  return Promise.all(files.map(async relativePath => ({ relativePath: `application-kit/${relativePath}`, sha256: hash(await fs.readFile(path.join(base, relativePath))) })));
}

async function requireRecord(runId: string, idempotencyKey: string) {
  const record = await readSubmissionRecord(runId, idempotencyKey);
  if (!record) throw coded('APPLICATION_SUBMISSION_NOT_FOUND', 404);
  return record;
}

async function writeRecord(record: SubmissionRecord) {
  const target = recordPath(record.runId, record.idempotencyKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  await fs.rename(temporary, target);
}

function applicationKitDir(runId: string) { return path.join(workspacesRoot(), safeId(runId, 'runId'), 'application-kit'); }
function recordPath(runId: string, key: string) { return path.join(workspacesRoot(), safeId(runId, 'runId'), 'application-submission', `${safeHash(key)}.json`); }
function workspacesRoot() { return path.resolve(process.env.WORKSPACES_DIR || 'workspaces'); }
function safeHash(value: string) { if (!/^[a-f0-9]{64}$/.test(value)) throw coded('INVALID_IDEMPOTENCY_KEY', 400); return value; }
function safeId(value: string, label: string) { const text = String(value || '').trim(); if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(text) || text.includes('..')) throw coded(`INVALID_${label.toUpperCase()}`, 400); return text; }
function assertGreenhouseUrl(value: string) { const url = new URL(value); if (url.protocol !== 'https:' || !(url.hostname === 'boards.greenhouse.io' || url.hostname.endsWith('.greenhouse.io'))) throw coded('UNSUPPORTED_APPLICATION_PORTAL', 400); }
function validateEvidence(value: SubmissionEvidence) { if (!value.confirmationId || !value.confirmationUrl.startsWith('https://') || Number.isNaN(Date.parse(value.submittedAt))) throw coded('APPLICATION_SUBMISSION_EVIDENCE_INCOMPLETE', 502); }
function hash(value: string | Buffer) { return crypto.createHash('sha256').update(value).digest('hex'); }
function coded(message: string, status: number) { const error = new Error(message) as Error & { status?: number }; error.status = status; return error; }
