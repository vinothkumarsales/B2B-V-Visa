import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/admin/auth';
import fs from 'node:fs/promises';
import path from 'node:path';

function applicationKitArtifactPath(runId: string): string {
  const base = process.env.WORKSPACES_DIR
    ? path.join(process.env.WORKSPACES_DIR, runId, 'application-kit')
    : path.join(process.cwd(), 'workspaces', runId, 'application-kit');
  return path.join(base, 'recruiter-email.md');
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin('application.read');
    const url = new URL(request.url);
    const runId = String(url.searchParams.get('runId') || '').trim();
    if (!runId) {
      return NextResponse.json({ ok: false, error: { code: 'INVALID_INPUT', message: 'runId is required' } }, { status: 400 });
    }

    const artifactPath = applicationKitArtifactPath(runId);
    try {
      await fs.access(artifactPath);
    } catch {
      return NextResponse.json({ ok: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Recruiter email draft not found for runId' } }, { status: 404 });
    }

    const text = await fs.readFile(artifactPath, 'utf8');
    return NextResponse.json({ ok: true, data: { runId, subject: '', raw: text } });
  } catch (error) {
    if (isAdminApiResponse(error)) return error as NextResponse;
    return NextResponse.json({ ok: false, error: { code: 'PROVIDER_UNAVAILABLE', message: 'Unable to load recruiter email draft.' } }, { status: 503 });
  }
}

function isAdminApiResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
