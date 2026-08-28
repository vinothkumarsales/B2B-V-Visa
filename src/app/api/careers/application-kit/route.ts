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
    return NextResponse.json({ ok: true, data: JSON.parse(data) });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to load application kit result.', 400);
  }
}

export async function START(request: NextRequest) {
  try {
    if (!careersFeatureEnabled('CAREERS_SAAS_ENABLED') || !careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
      return apiError('FORBIDDEN', 'Application kit is currently disabled.', 403);
    }

    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const allowedStates = ['ready_for_scan', 'shortlisted', 'blocked'];

    const runId = String(body?.runId ?? '').trim();
    const candidateId = String(body?.candidateId ?? '').trim();
    const jobId = String(body?.jobId ?? '').trim();
    const state = String(body?.state ?? '').trim().toLowerCase();

    if (!runId || !candidateId) {
      return apiError('INVALID_INPUT', 'runId and candidateId are required', 400);
    }

    if (!allowedStates.includes(state)) {
      return apiError('INVALID_INPUT', `state must be one of: ${allowedStates.join(', ')}`, 400);
    }

    const jobSummary = normalizeJobSummary(body?.jobSummary);
    const result = await enqueueApplicationKitTask({
      runId,
      candidateId,
      jobId: jobId || undefined,
      jobSummary,
    });

    return NextResponse.json({
      ok: true,
      data: {
        action: 'started',
        runId,
        candidateId,
        jobId,
        state,
        queuedJobId: result?.id,
      },
    }, { status: 202 });
  } catch (error) {
    if (isApiResponse(error)) return error;
    return apiError('INVALID_INPUT', 'Unable to start application kit task.', 400);
  }
}

function normalizeJobSummary(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const company = typeof obj.company === 'string' ? obj.company.trim() : '';
  const descriptionText = typeof obj.descriptionText === 'string' ? obj.descriptionText.trim() : '';
  const requiredSkills = Array.isArray(obj.requiredSkills) ? obj.requiredSkills.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).slice(0, 80) : [];
  const preferredSkills = Array.isArray(obj.preferredSkills) ? obj.preferredSkills.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).slice(0, 80) : [];
  const country = typeof obj.country === 'string' ? obj.country.trim() : 'Germany';
  const workMode = typeof obj.workMode === 'string' ? obj.workMode.trim() : 'hybrid';

  if (!country) return undefined;
  return { title: title || 'Software Engineer', company: company || 'Target Company', descriptionText, requiredSkills, preferredSkills, country, workMode };
}
