import { db } from '@/lib/db';
import { defaultApplicationStatuses, defaultDashboardSections, defaultMilestones, defaultTransitions } from './default-config';
import { getWalletBalanceMinor } from '@/server/wallet/wallet-ledger';

export async function getDashboardSections() {
  const sections = await db.dashboardSection.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: { versions: { orderBy: { version: 'desc' }, take: 1 }, audienceRules: true },
  });

  if (sections.length) return sections;

  return defaultDashboardSections.map((section) => ({
    id: section.key,
    key: section.key,
    name: section.name,
    type: section.type,
    status: 'draft' as const,
    targetAudience: { type: 'all_partners' },
    displayOrder: section.displayOrder,
    isVisible: true,
    startsAt: null,
    endsAt: null,
    updatedByUserId: null,
    lastPublishedAt: null,
    config: section.config,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    versions: [],
    audienceRules: [],
  }));
}

export async function getApplicationStatusReadModel() {
  const [statuses, milestones, transitions, mappings, slaRules] = await Promise.all([
    db.applicationStatusConfig.findMany({ orderBy: [{ displayOrder: 'asc' }] }),
    db.applicationMilestone.findMany({ orderBy: [{ displayOrder: 'asc' }] }),
    db.applicationStatusTransition.findMany({ orderBy: [{ fromStatusCode: 'asc' }, { toStatusCode: 'asc' }] }),
    db.applicationStatusMapping.findMany({ include: { milestone: true }, orderBy: [{ statusCode: 'asc' }] }),
    db.applicationSlaRule.findMany({ orderBy: [{ statusCode: 'asc' }] }),
  ]);

  return {
    statuses: statuses.length ? statuses : defaultApplicationStatuses.map((status) => ({
      id: status.code,
      code: status.code,
      adminLabel: status.adminLabel,
      partnerLabel: status.partnerLabel,
      partnerDescription: status.partnerDescription,
      internalDescription: null,
      icon: null,
      colorToken: status.colorToken,
      displayOrder: status.displayOrder,
      progressPercent: status.progressPercent,
      isPartnerVisible: true,
      isAdminVisible: true,
      isTerminal: Boolean(status.isTerminal),
      isSuccess: Boolean(status.isSuccess),
      isFailure: Boolean(status.isFailure),
      isActive: true,
      paymentStatusEffect: null,
      documentStatusEffect: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
    milestones: milestones.length ? milestones : defaultMilestones.map((milestone) => ({
      id: milestone.key,
      key: milestone.key,
      label: milestone.label,
      description: null,
      displayOrder: milestone.displayOrder,
      progressPercent: milestone.progressPercent,
      isPartnerVisible: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
    transitions: transitions.length ? transitions : defaultTransitions.map((transition) => ({
      id: `${transition.from}-${transition.to}`,
      fromStatusCode: transition.from,
      toStatusCode: transition.to,
      requiredRole: null,
      requiresPayment: false,
      requiresDocuments: false,
      requiresNotes: false,
      partnerNotification: false,
      internalNotification: false,
      crmSync: false,
      isActive: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    })),
    mappings,
    slaRules,
  };
}

export async function getPartnerDashboardPreview(uid: string) {
  const agency = await db.agency.findUnique({
    where: { id: uid },
    include: {
      memberships: { include: { user: true }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      applications: {
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { applicants: true },
      },
    },
  });
  if (!agency) return null;

  const [sections, walletBalanceMinor] = await Promise.all([
    getDashboardSections(),
    getWalletBalanceMinor(agency.id),
  ]);

  const applications = agency.applications;
  return {
    agency: {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      status: agency.status,
      ownerEmail: agency.memberships[0]?.user.email ?? null,
    },
    stats: {
      totalApplications: applications.length,
      approvedThisMonth: applications.filter((app) => app.status === 'APPROVED').length,
      pendingPayment: applications.filter((app) => app.status === 'PAYMENT_PENDING').length,
      walletBalanceMinor,
    },
    applications,
    sections,
  };
}

export async function bootstrapAdminReadPreviewDefaults() {
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
