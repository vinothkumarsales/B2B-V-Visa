import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import { readCheckpoint, PipelineStateManager } from '@/server/careers/application-kit/application-kit.service';

function toReviewConsoleItem(runId: string, state: Awaited<ReturnType<typeof readCheckpoint>>) {
  if (!state) return null;
  const pendingHitl = PipelineStateManager.hitlPending(state);
  const resumable = !pendingHitl && state.hitlApproved;
  return {
    runId,
    node: state.node,
    status: state.status,
    pendingHitl,
    resumable,
    hitlNote: state.hitlNote || null,
    overallFit: state.output?.overallFit || null,
    blockers: state.output?.blockers ?? 0,
    warnings: state.output?.warnings ?? 0,
    atsKeywordDensity: state.output?.atsKeywordDensity ?? null,
    finalStatus: state.output?.finalStatus || null,
    updatedAt: state.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('application.read');
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '').trim();

    if (runId) {
      const state = await readCheckpoint(runId);
      if (!state) {
        return NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Application kit checkpoint not found for runId' } }, { status: 404 });
      }
      return NextResponse.json({ ok: true, data: toReviewConsoleItem(runId, state) });
    }

    // List-style summary would require directory listing; for now we expose only
    // explicit diagnostic guidance because no global run manifest exists in 5A.
    return NextResponse.json({ ok: true, data: { note: 'Provide runId to view application-kit review console item.' } });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to load application kit console.' } }, { status: 503 });
  }
}

function isAdminApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
