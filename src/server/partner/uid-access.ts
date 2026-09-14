import { db } from '@/lib/db';
import { isReservedRootSlug } from '@/content/routes';
import { getAdminSession } from '@/server/admin/auth';
import { getSession } from '@/server/auth/session';
import { cookies } from 'next/headers';
import { IMPERSONATION_COOKIE, parseImpersonationCookie } from '@/app/api/admin/impersonate/route';

export type PartnerUidAccess =
  | { status: 'authorized'; agencyId: string }
  | { status: 'admin'; agencyId: string }
  | { status: 'impersonating'; agencyId: string; impersonation: { actorEmail: string; actorRole: string; sessionId: string; targetAgencyName: string; targetVvisaUid: string; startedAt: string } }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export async function resolvePartnerUidAccess(uid: string): Promise<PartnerUidAccess> {
  // A marketing route at the same path would shadow this segment anyway, so an
  // agency id that collides with one can never be reached here. Rejecting it up
  // front keeps the two route systems from disagreeing, and skips a DB round
  // trip for anything that is really a marketing URL.
  if (isReservedRootSlug(uid)) return { status: 'not_found' };

  const session = await getSession();
  if (!session) return { status: 'unauthenticated' };

  // ── AGENCY LOOKUP ──────────────────────────────────────────────────────────
  // Resolution order: vvisaUid (new) → id (cuid, backward-compat)
  const agency = await db.agency.findFirst({
    where: { OR: [{ vvisaUid: uid }, { id: uid }] },
    select: { id: true, vvisaUid: true, name: true },
  });
  if (!agency) return { status: 'not_found' };

  // ── CHECK IMPERSONATION COOKIE ─────────────────────────────────────────────
  // Admin may be impersonating this partner via a secure httpOnly cookie.
  const cookieStore = await cookies();
  const impersonationValue = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (impersonationValue) {
    const impersonation = parseImpersonationCookie(impersonationValue);
    if (
      impersonation &&
      impersonation.targetAgencyId === agency.id &&
      new Date(impersonation.expiresAt) > new Date()
    ) {
      // Verify the admin session is still valid
      const admin = await getAdminSession();
      if (admin?.permissions.includes('partner.impersonate')) {
        return {
          status: 'impersonating',
          agencyId: agency.id,
          impersonation: {
            actorEmail: impersonation.actorEmail,
            actorRole: impersonation.actorRole,
            sessionId: impersonation.sessionId,
            targetAgencyName: impersonation.targetAgencyName,
            targetVvisaUid: impersonation.targetVvisaUid,
            startedAt: impersonation.startedAt,
          },
        };
      }
    }
  }

  // ── NORMAL PARTNER ACCESS ──────────────────────────────────────────────────
  if (session.activeAgencyId === agency.id) {
    return { status: 'authorized', agencyId: agency.id };
  }

  // ── ADMIN READ-ONLY ACCESS ─────────────────────────────────────────────────
  const admin = await getAdminSession();
  if (admin?.permissions.includes('partner.read')) {
    return { status: 'admin', agencyId: agency.id };
  }

  return { status: 'forbidden' };
}
