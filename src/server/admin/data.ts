import { db } from '@/lib/db';

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
    db.agency.count(),
    db.agency.count({ where: { status: 'APPROVED' } }),
    db.agency.count({ where: { status: { in: ['DOCUMENTS_PENDING', 'UNDER_REVIEW'] } } }),
    db.visaApplication.count(),
    db.visaApplication.count({ where: { createdAt: { gte: today } } }),
    db.applicationDocument.count({ where: { status: { in: ['REQUESTED', 'MANUAL_REVIEW_REQUIRED', 'OCR_PENDING'] } } }),
    db.country.count({ where: { isActive: true } }),
    db.visaProduct.count({ where: { isActive: true } }),
    db.visaApplication.count({ where: { status: 'PAYMENT_PENDING' } }),
    db.visaApplication.count({ where: { status: 'APPROVED', updatedAt: { gte: monthStart } } }),
    db.visaApplication.count({ where: { status: 'REJECTED', updatedAt: { gte: monthStart } } }),
    db.dashboardSection.count({ where: { status: 'draft' } }).catch(() => 0),
    db.integrationEvent.count({ where: { status: { in: ['FAILED', 'FAILED_TERMINAL'] } } }),
    db.visaApplication.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { agency: true },
    }),
    db.agency.findMany({ take: 6, orderBy: { createdAt: 'desc' } }),
    db.auditLog.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { actorUser: true, agency: true } }),
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
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: { include: { user: true }, take: 3 },
      applications: { select: { id: true } },
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
