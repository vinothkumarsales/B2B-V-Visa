import { randomBytes } from 'crypto';
import { headers } from 'next/headers';
import { auditLog } from '@/server/audit/audit-log';
import { apiError } from '@/lib/api-response';
import { adminWritesEnabled, requireAdminPermission } from './auth';
import { adminFeatureEnabled, type AdminFeatureFlag } from './feature-flags';
import type { AdminPermission } from './permissions';

export type AdminWriteAuditInput = {
  permission: AdminPermission;
  action: string;
  entityType: string;
  entityId?: string | null;
  partnerUid?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string | null;
  success: boolean;
  failureCode?: string | null;
  impersonationSessionId?: string | null;
};

export async function requireAdminMutation(permission: AdminPermission, featureFlag?: AdminFeatureFlag) {
  const admin = await requireAdminPermission(permission);
  if (!adminWritesEnabled()) {
    throw apiError('ADMIN_WRITES_DISABLED', 'Admin write operations are currently disabled in production.', 403);
  }
  if (featureFlag && !adminFeatureEnabled(featureFlag)) {
    throw apiError('ADMIN_WRITES_DISABLED', 'This admin write feature is currently disabled in production.', 403);
  }
  return {
    ...admin,
    requestId: randomBytes(8).toString('hex'),
  };
}

export async function writeAdminAudit(input: AdminWriteAuditInput & {
  adminUid: string;
  adminEmail: string;
  adminRole: string;
  requestId: string;
}) {
  const headerStore = await headers();
  await auditLog({
    agencyId: input.partnerUid ?? undefined,
    actorUserId: input.adminUid,
    action: input.action,
    resourceType: input.entityType,
    resourceId: input.entityId ?? undefined,
    metadata: {
      adminUid: input.adminUid,
      adminEmail: input.adminEmail,
      adminRole: input.adminRole,
      permission: input.permission,
      partnerUid: input.partnerUid ?? null,
      beforeData: input.beforeData ?? null,
      afterData: input.afterData ?? null,
      reason: input.reason ?? null,
      requestId: input.requestId,
      success: input.success,
      failureCode: input.failureCode ?? null,
      impersonationSessionId: input.impersonationSessionId ?? null,
    },
    ipAddress: headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: headerStore.get('user-agent') ?? null,
  });
}
