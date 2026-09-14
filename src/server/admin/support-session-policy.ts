import type { AdminImpersonationMode, AdminRole } from '@prisma/client';

const MODE_RANK: Record<AdminImpersonationMode, number> = { view_only: 0, support: 1, operations: 2 };
export function supportModeAllows(actual: AdminImpersonationMode, required: AdminImpersonationMode) { return MODE_RANK[actual] >= MODE_RANK[required]; }

export function canStartSupportMode(role: AdminRole, mode: AdminImpersonationMode) {
  if (mode === 'view_only') return true;
  if (mode === 'support') return role === 'super_admin' || role === 'operations_admin' || role === 'support_admin';
  return role === 'super_admin' || role === 'operations_admin';
}

export function validSupportReason(reason: unknown) {
  return typeof reason === 'string' && reason.trim().length >= 8 && reason.trim().length <= 500;
}
