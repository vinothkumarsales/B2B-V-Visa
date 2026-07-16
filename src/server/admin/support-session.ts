import type { AdminImpersonationMode } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { supportModeAllows } from './support-session-policy';

export async function requireActiveSupportSession(input: {
  sessionId?: string;
  adminUid: string;
  partnerUid: string;
  minimumMode: AdminImpersonationMode;
  optional?: boolean;
}) {
  if (!input.sessionId) {
    if (input.optional) return null;
    throw apiError('FORBIDDEN', 'An active admin support session is required.', 403);
  }
  const session = await db.adminImpersonationSession.findFirst({
    where: { id: input.sessionId, actorAdminUid: input.adminUid, subjectAgencyId: input.partnerUid, status: 'active', expiresAt: { gt: new Date() } },
  });
  if (!session) throw apiError('FORBIDDEN', 'The admin support session is not active for this partner.', 403);
  if (!supportModeAllows(session.mode, input.minimumMode)) throw apiError('FORBIDDEN', `This action requires ${input.minimumMode} support mode.`, 403);
  await db.adminImpersonationSession.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } });
  return session;
}
