import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { getSession, requireSession } from '@/server/auth/session';
import { auditLog } from '@/server/audit/audit-log';
import {
  ADMIN_PERMISSION_MATRIX,
  hasAdminPermission,
  isBootstrapAdminEmail,
  roleFromMembership,
  type AdminPermission,
} from './permissions';
import type { AdminRole } from '@prisma/client';

export async function getAdminSession() {
  const session = await getSession();
  if (!session) return null;

  const storedAdmin = await db.adminUser.findUnique({ where: { userId: session.user.id } });
  const bootstrapRole = isBootstrapAdminEmail(session.user.email) ? 'super_admin' : roleFromMembership(session.role);
  const role = storedAdmin?.isActive && !storedAdmin.revokedAt ? storedAdmin.role : bootstrapRole;

  if (!role || !session.user.isActive) return null;

  return {
    id: session.id,
    user: session.user,
    role: role as AdminRole,
    permissions: ADMIN_PERMISSION_MATRIX[role as AdminRole],
    storedAdmin,
  };
}

export async function requireAdmin(permission?: AdminPermission) {
  await requireSession();
  const admin = await getAdminSession();
  if (!admin) {
    const headerStore = await headers();
    await auditLog({
      action: 'ADMIN_ACCESS_DENIED',
      resourceType: 'Admin',
      metadata: {
        path: headerStore.get('x-next-url') ?? null,
        userAgent: headerStore.get('user-agent') ?? null,
      },
    });
    throw apiError('FORBIDDEN', 'You do not have permission to access the VVisa Admin Console.', 403);
  }

  if (permission && !hasAdminPermission(admin.role, permission)) {
    throw apiError('FORBIDDEN', 'Your admin role does not permit this action.', 403);
  }

  return admin;
}
