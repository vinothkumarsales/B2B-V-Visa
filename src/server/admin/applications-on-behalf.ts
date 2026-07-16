import type { z } from 'zod';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { queueZohoCrmEvent } from '@/server/integrations/zoho/crm-outbox';

import { adminApplicationDraftSchema, adminApplicationSubmitSchema } from './workflow-schemas';
import { requireActiveSupportSession } from './support-session';
export { adminApplicationDraftSchema, adminApplicationSubmitSchema } from './workflow-schemas';

function optionalDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function resolvePricing(partnerUid: string, visaProductId: string) {
  const now = new Date();
  const product = await db.visaProduct.findFirst({
    where: { id: visaProductId, isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
    include: {
      prices: { where: { isActive: true, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, orderBy: { validFrom: 'desc' }, take: 1, include: { lines: true } },
      partnerPriceOverrides: { where: { partnerUid, status: 'active', OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!product) throw apiError('RESOURCE_NOT_FOUND', 'Visa product not found.', 404);
  const price = product.prices[0];
  const taxMinor = price?.gstMinor ?? 0;
  const baseMinor = price ? Math.max(0, price.totalAmountMinor - taxMinor) : product.amountMinor;
  const listedTotalMinor = baseMinor + taxMinor;
  const override = product.partnerPriceOverrides[0];
  let overrideMinor = 0;
  if (override) {
    if (override.overrideType === 'exact_price') overrideMinor = override.valueMinor - listedTotalMinor;
    if (override.overrideType === 'fixed_increase') overrideMinor = override.valueMinor;
    if (override.overrideType === 'fixed_decrease') overrideMinor = -override.valueMinor;
    if (override.overrideType === 'percentage_increase') overrideMinor = Math.round(listedTotalMinor * override.valueMinor / 10000);
    if (override.overrideType === 'percentage_decrease') overrideMinor = -Math.round(listedTotalMinor * override.valueMinor / 10000);
  }
  const totalAmountMinor = Math.max(0, listedTotalMinor + overrideMinor);
  const lines = [
    { type: 'global_base_price', label: 'Global base price', amountMinor: baseMinor, taxable: false },
    { type: 'partner_tier_adjustment', label: 'Partner tier adjustment', amountMinor: 0, taxable: false },
    { type: 'pricing_plan_adjustment', label: 'Pricing-plan adjustment', amountMinor: 0, taxable: false },
    { type: 'uid_override', label: 'UID-specific override', amountMinor: overrideMinor, taxable: false },
    { type: 'promotion', label: 'Promotion', amountMinor: 0, taxable: false },
    { type: 'manual_adjustment', label: 'Manual adjustment', amountMinor: 0, taxable: false },
    { type: 'tax', label: 'Tax', amountMinor: taxMinor, taxable: false },
    { type: 'wallet_deduction', label: 'Wallet deduction', amountMinor: 0, taxable: false },
  ];
  return { product, totalAmountMinor, lines, snapshot: { visaProductId: product.id, pricingVersion: product.pricingVersion, currency: product.currency, capturedAt: now.toISOString(), partnerUid, overrideId: override?.id ?? null, lines, finalPayableMinor: totalAmountMinor } };
}

export async function createApplicationDraftOnBehalf(input: { partnerUid: string; adminUid: string; payload: z.infer<typeof adminApplicationDraftSchema> }) {
  const partner = await db.agency.findUnique({ where: { id: input.partnerUid }, select: { id: true } });
  if (!partner) throw apiError('RESOURCE_NOT_FOUND', 'Partner not found.', 404);
  if (input.payload.supportSessionId) {
    await requireActiveSupportSession({ sessionId: input.payload.supportSessionId, adminUid: input.adminUid, partnerUid: partner.id, minimumMode: 'support' });
  }
  const pricing = await resolvePricing(partner.id, input.payload.visaProductId);
  return db.$transaction(async (tx) => {
    const application = await tx.visaApplication.create({
      data: {
        agencyId: partner.id,
        visaProductId: pricing.product.id,
        internalId: input.payload.internalId,
        destination: pricing.product.destination,
        visaType: pricing.product.name,
        status: 'DRAFT',
        pricingSnapshot: pricing.snapshot,
        totalAmountMinor: pricing.totalAmountMinor,
        currency: pricing.product.currency,
        createdByAdminUid: input.adminUid,
        createdOnBehalfOfUid: partner.id,
        adminSupportSessionId: input.payload.supportSessionId,
        adminSubmissionReason: input.payload.reason,
        applicants: { create: { ...input.payload.applicant, dateOfBirth: optionalDate(input.payload.applicant.dateOfBirth), dateOfExpiry: optionalDate(input.payload.applicant.dateOfExpiry) } },
        pricingDetail: { create: { currency: pricing.product.currency, totalAmountMinor: pricing.totalAmountMinor, snapshot: pricing.snapshot, lines: { create: pricing.lines } } },
        statusEvents: { create: { nextStatus: 'DRAFT', actorUserId: input.adminUid, reason: 'Application draft created on behalf of partner' } },
      },
      include: { applicants: true, pricingDetail: { include: { lines: true } } },
    });
    return application;
  });
}

export async function submitApplicationOnBehalf(input: { applicationId: string; adminUid: string; payload: z.infer<typeof adminApplicationSubmitSchema> }) {
  if (input.payload.walletDeduction) throw apiError('ADMIN_WRITES_DISABLED', 'Wallet deduction remains disabled until second-confirmation safeguards are enabled.', 403);
  const application = await db.visaApplication.findUnique({ where: { id: input.applicationId }, include: { documents: true } });
  if (!application) throw apiError('RESOURCE_NOT_FOUND', 'Application not found.', 404);
  if (application.status !== 'DRAFT' || !application.createdOnBehalfOfUid) throw apiError('INVALID_ADMIN_MUTATION', 'Only on-behalf draft applications can be submitted here.', 409);
  if (application.adminSupportSessionId) await requireActiveSupportSession({ sessionId: application.adminSupportSessionId, adminUid: input.adminUid, partnerUid: application.agencyId, minimumMode: 'operations' });
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.visaApplication.update({ where: { id: application.id }, data: { status: 'DOCUMENTS_PENDING', submittedByAdminUid: input.adminUid, submittedAt: new Date(), adminSubmissionReason: input.payload.reason } });
    await tx.applicationStatusEvent.create({ data: { applicationId: application.id, previousStatus: 'DRAFT', nextStatus: 'DOCUMENTS_PENDING', actorUserId: input.adminUid, reason: input.payload.reason } });
    return result;
  });
  await queueZohoCrmEvent({ agencyId: updated.agencyId, eventType: 'APPLICATION_SYNC', idempotencyKey: `zoho-crm:admin-application-submitted:${updated.id}:${updated.version}`, entityType: 'VisaApplication', entityId: updated.id, aggregateId: updated.id, payload: { applicationId: updated.id, agencyId: updated.agencyId, createdOnBehalf: true } });
  return updated;
}
