import type { AdminImpersonationMode, AdminRole } from '@prisma/client';

export function canStartSupportMode(role: AdminRole, mode: AdminImpersonationMode) {
  if (mode === 'view_only') return true;
  if (mode === 'support') return role === 'super_admin' || role === 'operations_admin' || role === 'support_admin';
  return role === 'super_admin' || role === 'operations_admin';
}

export function validSupportReason(reason: unknown) {
  return typeof reason === 'string' && reason.trim().length >= 8 && reason.trim().length <= 500;
}
