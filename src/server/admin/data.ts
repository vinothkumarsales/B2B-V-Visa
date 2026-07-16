import { db } from '@/lib/db';

function adminReadFallback<T>(stage: string, fallback: T) {
  return (error: unknown): T => {
    const prismaError = error as {
      code?: string;
      meta?: { modelName?: string; model?: string; target?: unknown };
      message?: string;
    };
    console.error('ADMIN_READ_FAILED', {
      route: 'admin_overview',
      stage,
      prismaCode: prismaError.code ?? null,
      model: prismaError.meta?.modelName ?? prismaError.meta?.model ?? null,
      target: prismaError.meta?.target ?? null,
      safeErrorCode: 'ADMIN_READ_FAILED',
    });
    return fallback;
  };
}

async function readMetric<T>(stage: string, read: Promise<T>, fallback: T) {
  return read.catch(adminReadFallback(stage, fallback));
}

export async function getAdminOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalPartners,
    activePartners,
    pendingPartnerApprovals,
    totalApplications,
    applicationsSubmittedToday,
    documentsPending,
    countriesPublished,
    visaProductsPublished,
    pendingPayments,
    approvedThisMonth,
    rejectedThisMonth,
    draftChanges,
    failedIntegrations,
    recentApplications,
    recentPartners,
    recentAuditLogs,
  ] = await Promise.all([
    readMetric('agency.total.count', db.agency.count(), null),
    readMetric('agency.approved.count', db.agency.count({ where: { status: 'APPROVED' } }), null),
    readMetric('agency.pending_approval.count', db.agency.count({ where: { status: { in: ['DOCUMENTS_PENDING', 'UNDER_REVIEW'] } } }), null),
    readMetric('visa_application.total.count', db.visaApplication.count(), null),
    readMetric('visa_application.today.count', db.visaApplication.count({ where: { createdAt: { gte: today } } }), null),
    readMetric('application_document.pending.count', db.applicationDocument.count({ where: { status: { in: ['REQUESTED', 'MANUAL_REVIEW_REQUIRED', 'OCR_PENDING'] } } }), null),
    readMetric('country.active.count', db.country.count({ where: { isActive: true } }), null),
    readMetric('visa_product.active.count', db.visaProduct.count({ where: { isActive: true } }), null),
    readMetric('visa_application.payment_pending.count', db.visaApplication.count({ where: { status: 'PAYMENT_PENDING' } }), null),
    readMetric('visa_application.approved_month.count', db.visaApplication.count({ where: { status: 'APPROVED', updatedAt: { gte: monthStart } } }), null),
    readMetric('visa_application.rejected_month.count', db.visaApplication.count({ where: { status: 'REJECTED', updatedAt: { gte: monthStart } } }), null),
    readMetric('dashboard_section.draft.count', db.dashboardSection.count({ where: { status: 'draft' } }), null),
    readMetric('integration_event.failed.count', db.integrationEvent.count({ where: { status: { in: ['FAILED', 'FAILED_TERMINAL'] } } }), null),
    readMetric('visa_application.recent.list', db.visaApplication.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { agency: true },
    }), []),
    readMetric('agency.recent.list', db.agency.findMany({ take: 6, orderBy: { createdAt: 'desc' } }), []),
    readMetric('audit_log.recent.list', db.auditLog.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { actorUser: true, agency: true } }), []),
  ]);

  return {
    totalPartners,
    activePartners,
    pendingPartnerApprovals,
    totalApplications,
    applicationsSubmittedToday,
    pendingPayments,
    documentsPending,
    applicationsRequiringAttention: documentsPending,
    approvedThisMonth,
    rejectedThisMonth,
    countriesPublished,
    visaProductsPublished,
    draftChanges,
    failedIntegrations,
    recentApplications,
    recentPartners,
    recentAuditLogs,
  };
}

export async function searchPartners(query?: string) {
  const normalized = query?.trim();
  const matchingApplications = normalized
    ? await db.visaApplication.findMany({
        where: {
          OR: [
            { id: { contains: normalized, mode: 'insensitive' } },
            { internalId: { contains: normalized, mode: 'insensitive' } },
            { zohoRecordId: { contains: normalized, mode: 'insensitive' } },
          ],
        },
        select: { agencyId: true },
        take: 50,
      })
    : [];
  const matchingAgencyIds = [...new Set(matchingApplications.map((application) => application.agencyId))];
  return db.agency.findMany({
    take: 50,
    where: normalized
      ? {
          OR: [
            { id: { contains: normalized, mode: 'insensitive' } },
            { name: { contains: normalized, mode: 'insensitive' } },
            { email: { contains: normalized, mode: 'insensitive' } },
            { phone: { contains: normalized, mode: 'insensitive' } },
            { gstNumber: { contains: normalized, mode: 'insensitive' } },
            { city: { contains: normalized, mode: 'insensitive' } },
            { zohoRecordId: { contains: normalized, mode: 'insensitive' } },
            { id: { in: matchingAgencyIds } },
            {
              memberships: {
                some: {
                  user: {
                    OR: [
                      { name: { contains: normalized, mode: 'insensitive' } },
                      { email: { contains: normalized, mode: 'insensitive' } },
                      { phone: { contains: normalized, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: { include: { user: true }, take: 3 },
      applications: { select: { id: true, internalId: true, zohoRecordId: true } },
      wallets: { include: { entries: true } },
    },
  });
}

export async function getPartnerAdminProfile(uid: string) {
  return db.agency.findUnique({
    where: { id: uid },
    include: {
      memberships: { include: { user: true } },
      applications: { orderBy: { createdAt: 'desc' }, take: 10, include: { visaProduct: true } },
      wallets: { include: { entries: { orderBy: { createdAt: 'desc' }, take: 20 } } },
      documents: { orderBy: { createdAt: 'desc' }, take: 10 },
      priceOverrides: { orderBy: { createdAt: 'desc' }, include: { product: true } },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 20, include: { actorUser: true } },
    },
  });
}

export function walletBalanceMinor(entries: Array<{ amountMinor: number }>) {
  return entries.reduce((sum, entry) => sum + entry.amountMinor, 0);
}

export function formatMoneyFromMinor(amountMinor: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
