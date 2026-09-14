import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { careersFeatureEnabled } from './feature-flags';
import { requireSession } from '@/server/auth/session';

export type ConnectionProvider = 'mail' | 'linkedin';

function ok(data: unknown) {
  return NextResponse.json({ ok: true as const, data });
}

async function requireCareerCandidate(userId: string) {
  const candidate = await db.careerCandidate.findFirst({ where: { userId } });
  if (!candidate) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Career profile required' } }, { status: 404 }) as unknown as Error;
  }
  return candidate;
}

export async function listConnections() {
  if (!careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Careers application kit disabled' } }, { status: 404 }) as unknown as Error;
  }
  const session = await requireSession();
  const connections = await db.careerConnection.findMany({
    where: { userId: session.user.id },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });
  const candidate = await requireCareerCandidate(session.user.id);
  return ok({ providers: connections as [], candidateId: candidate.id });
}

export async function getConnectionDetail(provider: string) {
  if (!careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Careers application kit disabled' } }, { status: 404 }) as unknown as Error;
  }
  const session = await requireSession();
  const connection = await db.careerConnection.findFirst({
    where: { userId: session.user.id, provider: provider as ConnectionProvider },
  });
  if (!connection) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Connection not found' } }, { status: 404 }) as unknown as Error;
  }
  return ok(connection);
}

export async function initiateConnection(provider: string) {
  if (!careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Careers application kit disabled' } }, { status: 404 }) as unknown as Error;
  }
  const session = await requireSession();

  const candidate = await requireCareerCandidate(session.user.id);

  const connection = await db.careerConnection.upsert({
    where: {
      id: `${session.user.id}-${provider}`,
    },
    update: {},
    create: {
      userId: session.user.id,
      provider: provider as ConnectionProvider,
      status: 'connecting',
      connected: false,
      meta: {},
      scopes: [],
    },
  });

  const authorizeUrl = `/api/careers/connections/${provider}/authorize?candidateId=${candidate.id}`;
  return ok({ connectionId: connection.id, authorizeUrl });
}

export async function revokeConnection(provider: string) {
  if (!careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Careers application kit disabled' } }, { status: 404 }) as unknown as Error;
  }
  const session = await requireSession();
  const connection = await db.careerConnection.findFirst({
    where: { userId: session.user.id, provider: provider as ConnectionProvider },
  });
  if (!connection) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Connection not found' } }, { status: 404 }) as unknown as Error;
  }
  const updated = await db.careerConnection.update({
    where: { id: connection.id },
    data: {
      status: 'revoked',
      connected: false,
      tokenExpiresAt: null,
      providerAccountId: null,
    },
  });
  return ok(updated);
}

export async function performHealthCheck(provider: string) {
  if (!careersFeatureEnabled('CAREERS_APPLICATION_KIT_ENABLED')) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Careers application kit disabled' } }, { status: 404 }) as unknown as Error;
  }
  const session = await requireSession();
  const connection = await db.careerConnection.findFirst({
    where: { userId: session.user.id, provider: provider as ConnectionProvider },
  });
  if (!connection) {
    throw NextResponse.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Connection not found' } }, { status: 404 }) as unknown as Error;
  }
  const healthy = Boolean(connection.tokenExpiresAt && connection.tokenExpiresAt > new Date());
  return ok({ healthy, scopes: connection.scopes, lastSyncAt: connection.lastSyncAt });
}
