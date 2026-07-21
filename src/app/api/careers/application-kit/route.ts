import { NextRequest, NextResponse } from 'next/server';
import { apiError, isApiResponse } from '@/lib/api-response';
import { requireSession } from '@/server/auth/session';
import { careersFeatureEnabled } from '@/server/careers/feature-flags';
import { enqueueApplicationKitTask } from '@/server/queues/application-kit.queue';
import fs from 'node:fs/promises';
import path from 'node:path';

function applicationKitArtifactPath(runId: string) {
  const base = process.env.WORKSPACES_DIR ? path.join(process.env.WORKSPACES_DIR, runId, 'application-kit') : path.join(process.cwd(), 'workspaces', runId, 'application-kit');
  return path.join(base, 'application-kit.json');
}

export async function POST(request: NextRequest) {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
      return apiError('FORBIDDEN', 'Application kit is currently disabled.', 403);
    }

    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const runId = String(body?.runId ?? '').trim();
    const candidateId = String(body?.candidateId ?? '').trim();
    const jobId = String(body?.jobId ?? '').trim();

    if (!runId || !candidateId) {
      return apiError('INVALID_INPUT', 'runId and candidateId are required', 400);
    }

    const job = await enqueueApplicationKitTask({
      runId,
      candidateId,
      jobId: jobId || undefined,
      jobSummary: body?.jobSummary || undefined,
    });

    return NextResponse.json(
      { ok: true, queued: true, queuedJobId: job?.id, runId, candidateId, jobId },
      { status: 202 }
    );
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to queue application kit task.', 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
      return apiError('FORBIDDEN', 'Application kit is currently disabled.', 403);
    }

    await requireSession();
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '').trim();

    if (!runId) {
      return apiError('INVALID_INPUT', 'runId is required', 400);
    }

    const artifactPath = applicationKitArtifactPath(runId);
    const exists = await fs.access(artifactPath).then(() => true).catch(() => false);
    if (!exists) {
      return apiError('RESOURCE_NOT_FOUND', 'Application kit result not found for runId', 404);
    }

    const data = await fs.readFile(artifactPath, 'utf8');
    return NextResponse.json({ runId, result: JSON.parse(data) });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to load application kit result.', 400);
  }
}
