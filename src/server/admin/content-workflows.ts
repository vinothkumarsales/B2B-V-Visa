import type { z } from 'zod';
import type { ApplicationStatus, Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';

import { contentPublishSchema, contentRollbackSchema, dashboardDraftSchema, statusDraftSchema } from './workflow-schemas';
export { contentPublishSchema, contentRollbackSchema, dashboardDraftSchema, statusDraftSchema } from './workflow-schemas';

export async function saveDashboardDraft(input: z.infer<typeof dashboardDraftSchema> & { adminUid: string }) {
  const section = await db.dashboardSection.findUnique({ where: { key: input.sectionKey }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  if (!section) throw apiError('RESOURCE_NOT_FOUND', 'Dashboard section not found.', 404);
  return db.dashboardSectionVersion.create({ data: { dashboardSectionId: section.id, version: (section.versions[0]?.version ?? 0) + 1, status: 'draft', snapshot: input.snapshot as Prisma.InputJsonValue, createdByUserId: input.adminUid } });
}

export async function publishDashboardVersion(versionId: string, adminUid: string) {
  const version = await db.dashboardSectionVersion.findUnique({ where: { id: versionId }, include: { dashboardSection: true } });
  if (!version) throw apiError('RESOURCE_NOT_FOUND', 'Dashboard draft version not found.', 404);
  const snapshot = version.snapshot as Record<string, unknown>;
  const now = new Date();
  return db.$transaction(async (tx) => {
    await tx.dashboardSectionVersion.updateMany({ where: { dashboardSectionId: version.dashboardSectionId, status: 'published' }, data: { status: 'archived' } });
    const published = await tx.dashboardSectionVersion.update({ where: { id: version.id }, data: { status: 'published', publishedAt: now } });
    await tx.dashboardSection.update({ where: { id: version.dashboardSectionId }, data: { status: 'published', config: version.snapshot as Prisma.InputJsonValue, isVisible: Boolean(snapshot.isVisible), displayOrder: Number(snapshot.displayOrder ?? version.dashboardSection.displayOrder), targetAudience: (snapshot.targetAudience ?? version.dashboardSection.targetAudience) as Prisma.InputJsonValue, startsAt: typeof snapshot.startsAt === 'string' ? new Date(snapshot.startsAt) : null, endsAt: typeof snapshot.endsAt === 'string' ? new Date(snapshot.endsAt) : null, updatedByUserId: adminUid, lastPublishedAt: now } });
    return published;
  });
}

export async function saveStatusDraft(input: z.infer<typeof statusDraftSchema> & { adminUid: string }) {
  const config = await db.applicationStatusConfig.findUnique({ where: { code: input.code as ApplicationStatus }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } });
  if (!config) throw apiError('RESOURCE_NOT_FOUND', 'Application status configuration not found.', 404);
  return db.applicationStatusConfigVersion.create({ data: { statusConfigId: config.id, version: (config.versions[0]?.version ?? 0) + 1, status: 'draft', snapshot: input.snapshot, createdByUserId: input.adminUid } });
}

export async function publishStatusVersion(versionId: string) {
  const version = await db.applicationStatusConfigVersion.findUnique({ where: { id: versionId }, include: { statusConfig: true } });
  if (!version) throw apiError('RESOURCE_NOT_FOUND', 'Status draft version not found.', 404);
  const parsed = statusDraftSchema.shape.snapshot.safeParse(version.snapshot);
  if (!parsed.success) throw apiError('INVALID_ADMIN_MUTATION', 'Stored status draft is invalid.', 409);
  const now = new Date();
  return db.$transaction(async (tx) => {
    await tx.applicationStatusConfigVersion.updateMany({ where: { statusConfigId: version.statusConfigId, status: 'published' }, data: { status: 'archived' } });
    const published = await tx.applicationStatusConfigVersion.update({ where: { id: version.id }, data: { status: 'published', publishedAt: now } });
    await tx.applicationStatusConfig.update({ where: { id: version.statusConfigId }, data: parsed.data });
    return published;
  });
}
