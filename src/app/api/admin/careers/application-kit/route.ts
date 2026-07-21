import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { approveApplicationKitHitl, PipelineStateManager, readCheckpoint } from '@/server/careers/application-kit/application-kit.service';
import fs from 'node:fs/promises';
import path from 'node:path';

function applicationKitArtifactPath(runId: string) {
  const base = process.env.WORKSPACES_DIR
    ? path.join(process.env.WORKSPACES_DIR, runId, 'application-kit')
    : path.join(process.cwd(), 'workspaces', runId, 'application-kit');
  return path.join(base, 'application-kit.json');
}

async function readApplicationKitResult(runId: string) {
  const artifactPath = applicationKitArtifactPath(runId);
  try {
    await fs.access(artifactPath);
    return JSON.parse(await fs.readFile(artifactPath, 'utf8'));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin('application.read');
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '').trim();
    if (!runId) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'runId is required' } }, { status: 400 });
    }

    const state = await readCheckpoint(runId);
    if (!state) {
      return NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Application kit checkpoint not found for runId' } }, { status: 404 });
    }

    const pendingHitl = PipelineStateManager.hitlPending(state);
    const result = await readApplicationKitResult(runId);

    return NextResponse.json({ ok: true, data: { runId, pendingHitl, state, result } });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to load application kit result.' } }, { status: 503 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin('application_status.write');
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '').trim();
    if (!runId) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'runId is required' } }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (action === 'hitl-approve') {
      const existing = await readCheckpoint(runId);
      if (!existing) {
        return NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Application kit checkpoint not found for runId' } }, { status: 404 });
      }
      try {
        PipelineStateManager.assertHitlPending(existing);
      } catch (stateError) {
        const message = (stateError as Error).message || 'Invalid state for HITL approval';
        return NextResponse.json({ ok: false, error: { code: 'INVALID_STATE', message } }, { status: 409 });
      }

      const state = await approveApplicationKitHitl(runId, note || 'Approved for revision.');
      return NextResponse.json({ ok: true, data: { runId, action: 'hitl-approve', state } });
    }

    if (action === 'resume') {
      const underlying = await readApplicationKitResult(runId);
      const checkpoint = await readCheckpoint(runId);
      if (!checkpoint) {
        return NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Application kit checkpoint not found for runId' } }, { status: 404 });
      }
      try {
        PipelineStateManager.assertResumable(checkpoint);
      } catch (resumeError) {
        const message = (resumeError as Error).message || 'Invalid state for resume';
        return NextResponse.json({ ok: false, error: { code: 'INVALID_STATE', message } }, { status: 409 });
      }

      return NextResponse.json({ ok: true, data: { runId, action: 'resume', result: underlying } });
    }

    return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'Unsupported action. Use action=hitl-approve or action=resume.' } }, { status: 400 });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to process application-kit operation.' } }, { status: 503 });
  }
}

function isAdminApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
