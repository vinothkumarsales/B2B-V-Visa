import { db } from '@/lib/db';
import { getAdminSession } from '@/server/admin/auth';
import { getSession } from '@/server/auth/session';

export type PartnerUidAccess =
  | { status: 'authorized'; agencyId: string }
  | { status: 'admin'; agencyId: string }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export async function resolvePartnerUidAccess(uid: string): Promise<PartnerUidAccess> {
  const session = await getSession();
  if (!session) return { status: 'unauthenticated' };

  const agency = await db.agency.findUnique({
    where: { id: uid },
    select: { id: true },
  });
  if (!agency) return { status: 'not_found' };

  if (session.activeAgencyId === agency.id) {
    return { status: 'authorized', agencyId: agency.id };
  }

  const admin = await getAdminSession();
  if (admin?.permissions.includes('partner.read')) {
    return { status: 'admin', agencyId: agency.id };
  }

  return { status: 'forbidden' };
}
