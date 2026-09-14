import { PrismaClient } from '@prisma/client';
import { defaultApplicationStatuses, defaultDashboardSections, defaultMilestones, defaultTransitions } from '../../src/server/admin/default-config.ts';

const db = new PrismaClient();

async function bootstrapAdminReadPreviewDefaults(): Promise<void> {
  for (const section of defaultDashboardSections) {
    await db.dashboardSection.upsert({
      where: { key: section.key },
      update: {},
      create: {
        key: section.key,
        name: section.name,
        type: section.type,
        status: 'draft',
        targetAudience: { type: 'all_partners' },
        displayOrder: section.displayOrder,
        config: section.config,
        versions: {
          create: {
            version: 1,
            status: 'draft',
            snapshot: section.config,
          },
        },
      },
    });
  }

  for (const milestone of defaultMilestones) {
    await db.applicationMilestone.upsert({
      where: { key: milestone.key },
      update: {},
      create: {
        key: milestone.key,
        label: milestone.label,
        displayOrder: milestone.displayOrder,
        progressPercent: milestone.progressPercent,
      },
    });
  }

  for (const status of defaultApplicationStatuses) {
    await db.applicationStatusConfig.upsert({
      where: { code: status.code },
      update: {},
      create: {
        code: status.code,
        adminLabel: status.adminLabel,
        partnerLabel: status.partnerLabel,
        partnerDescription: status.partnerDescription,
        colorToken: status.colorToken,
        displayOrder: status.displayOrder,
        progressPercent: status.progressPercent,
        isTerminal: Boolean(status.isTerminal),
        isSuccess: Boolean(status.isSuccess),
        isFailure: Boolean(status.isFailure),
      },
    });
  }

  const milestoneByKey = new Map((await db.applicationMilestone.findMany()).map((milestone) => [milestone.key, milestone.id]));
  for (const status of defaultApplicationStatuses) {
    await db.applicationStatusMapping.upsert({
      where: { id: `default-${status.code}` },
      update: {},
      create: {
        id: `default-${status.code}`,
        statusCode: status.code,
        milestoneId: milestoneByKey.get(status.milestoneKey),
      },
    });
  }

  for (const transition of defaultTransitions) {
    await db.applicationStatusTransition.upsert({
      where: {
        fromStatusCode_toStatusCode: {
          fromStatusCode: transition.from,
          toStatusCode: transition.to,
        },
      },
      update: {},
      create: {
        fromStatusCode: transition.from,
        toStatusCode: transition.to,
      },
    });
  }
}

bootstrapAdminReadPreviewDefaults()
  .then(() => {
    console.log('Admin read/preview defaults bootstrapped.');
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Bootstrap failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
