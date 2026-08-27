import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { approveSubmission, prepareSubmissionPreview, readSubmissionRecord } from '@/server/careers/application-submission.service';
import { enqueueApplicationSubmission } from '@/server/queues/application-submission.queue';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('application.read');
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '');
    const idempotencyKey = String(url.searchParams.get('idempotencyKey') || '');
    const record = await readSubmissionRecord(runId, idempotencyKey);
    return record ? NextResponse.json({ ok: true, data: record }) : NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Submission record not found.' } }, { status: 404 });
  } catch (error) { return responseError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin('application_status.write');
    const body = await request.json();
    if (body.action === 'preview') {
      const record = await prepareSubmissionPreview({ runId: body.runId, candidateId: body.candidateId, externalJobId: body.externalJobId, jobUrl: body.jobUrl });
      return NextResponse.json({ ok: true, data: record });
    }
    if (body.action === 'approve') {
      const record = await approveSubmission({ runId: body.runId, idempotencyKey: body.idempotencyKey, previewHash: body.previewHash, actorId: admin.id });
      return NextResponse.json({ ok: true, data: record });
    }
    if (body.action === 'submit') {
      const job = await enqueueApplicationSubmission({ runId: body.runId, idempotencyKey: body.idempotencyKey });
      return NextResponse.json({ ok: true, data: { queued: true, jobId: job.id, idempotencyKey: body.idempotencyKey } }, { status: 202 });
    }
    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Unsupported action.' } }, { status: 400 });
  } catch (error) { return responseError(error); }
}

function responseError(error: unknown) {
  if (error instanceof NextResponse) return error;
  const value = error as Error & { status?: number };
  const status = value.status || 503;
  return NextResponse.json({ ok: false, error: { code: value.message || 'PROVIDER_UNAVAILABLE', message: value.message || 'Application submission unavailable.' } }, { status });
}
