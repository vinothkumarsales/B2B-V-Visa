import { db } from '@/lib/db';
import { createLedgerEntry } from '@/server/wallet/wallet-ledger';
import { randomBytes } from 'crypto';
import type { ReferralStatus, ReferralRewardStatus, ReferralRewardCondition } from '@prisma/client';

export interface CreateReferralInput {
  partnerAgencyId: string;
  partnerUid: string;
  productId: string;
  referralLinkId?: string;
  clientName: string;
  clientMobile: string;
  clientWhatsapp?: string;
  clientEmail: string;
  clientCountry?: string;
  clientCity?: string;
  clientNationality?: string;
  clientLanguage?: string;
  notes?: string;
  consent?: boolean;
  travelDate?: string | Date;
  numberOfApplicants?: number;
  urgency?: string;
  passportAvailable?: boolean;
  budget?: string;
  existingRefusal?: boolean;
  attachments?: any;
  actor?: string;
}

export function generateReferralCode(partnerUid: string): string {
  const shortUid = partnerUid.replace(/^VVA/, '').slice(0, 4);
  const randomHex = randomBytes(2).toString('hex').toUpperCase();
  return `REF-${shortUid}-${randomHex}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '').trim();
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Checks for existing client records across Referrals and VisaInterests.
 * Returns duplicate details internally without exposing external partner information.
 */
export async function checkClientDuplicate(email: string, mobile: string) {
  const cleanEmail = normalizeEmail(email);
  const cleanMobile = normalizePhone(mobile);

  // 1. Check existing referrals
  const existingReferral = await db.referral.findFirst({
    where: {
      OR: [
        { clientEmail: { equals: cleanEmail, mode: 'insensitive' } },
        { clientMobile: cleanMobile },
      ],
    },
    select: { id: true, partnerAgencyId: true, createdAt: true },
  });

  if (existingReferral) {
    return {
      isDuplicate: true,
      matchedSource: 'referral',
      existingReferralId: existingReferral.id,
    };
  }

  // 2. Check existing leads/interests
  const existingInterest = await db.visaInterest.findFirst({
    where: {
      OR: [
        { applicantEmail: { equals: cleanEmail, mode: 'insensitive' } },
        { applicantMobile: cleanMobile },
      ],
    },
    select: { id: true, agencyId: true, createdAt: true },
  });

  if (existingInterest) {
    return {
      isDuplicate: true,
      matchedSource: 'visa_interest',
      existingInterestId: existingInterest.id,
    };
  }

  return { isDuplicate: false };
}

/**
 * Calculates referral reward based on product rules or category defaults.
 */
export async function calculateReferralReward(productId: string) {
  const product = await db.visaProduct.findUnique({
    where: { id: productId },
    select: { id: true, name: true, category: true, amountMinor: true, currency: true, destination: true },
  });

  if (!product) throw new Error('Product not found');

  // Check specific product reward rule
  let rule = await db.referralRewardRule.findFirst({
    where: { productId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  // Check category rule
  if (!rule && product.category) {
    rule = await db.referralRewardRule.findFirst({
      where: { productCategory: product.category, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  let rewardAmountMinor = 150000; // Default ₹1,500 (150000 minor paise)
  let condition: ReferralRewardCondition = 'FULL_PAYMENT';

  if (rule) {
    condition = rule.rewardCondition;
    if (rule.rewardType === 'FIXED') {
      rewardAmountMinor = rule.rewardAmountMinor;
    } else if (rule.rewardType === 'PERCENTAGE') {
      rewardAmountMinor = Math.round((product.amountMinor * rule.rewardAmountMinor) / 10000);
    }
  } else {
    // Dynamic default: 10% of product price, capped between ₹1,000 and ₹5,000
    const calculated = Math.round(product.amountMinor * 0.1);
    rewardAmountMinor = Math.max(100000, Math.min(500000, calculated));
  }

  return {
    rewardAmountMinor,
    rewardCondition: condition,
    rewardRuleId: rule?.id ?? null,
    product,
  };
}

/**
 * Creates a new partner client referral with duplicate detection and timeline event.
 */
export async function createReferral(input: CreateReferralInput) {
  const cleanEmail = normalizeEmail(input.clientEmail);
  const cleanMobile = normalizePhone(input.clientMobile);

  const duplicateCheck = await checkClientDuplicate(cleanEmail, cleanMobile);
  const { rewardAmountMinor, rewardCondition, rewardRuleId, product } = await calculateReferralReward(input.productId);

  const referralCode = generateReferralCode(input.partnerUid);

  const parsedTravelDate = input.travelDate ? new Date(input.travelDate) : null;

  const referral = await db.$transaction(async (tx) => {
    const created = await tx.referral.create({
      data: {
        referralCode,
        partnerAgencyId: input.partnerAgencyId,
        partnerUid: input.partnerUid,
        productId: input.productId,
        referralLinkId: input.referralLinkId ?? null,
        clientName: input.clientName.trim(),
        clientMobile: cleanMobile,
        clientWhatsapp: input.clientWhatsapp ? normalizePhone(input.clientWhatsapp) : null,
        clientEmail: cleanEmail,
        clientCountry: input.clientCountry ?? product.destination ?? 'India',
        clientCity: input.clientCity ?? null,
        clientNationality: input.clientNationality ?? 'Indian',
        clientLanguage: input.clientLanguage ?? 'English',
        notes: input.notes ?? null,
        consent: input.consent ?? true,
        travelDate: parsedTravelDate,
        numberOfApplicants: input.numberOfApplicants ?? 1,
        urgency: input.urgency ?? 'Standard',
        passportAvailable: input.passportAvailable ?? true,
        budget: input.budget ?? null,
        existingRefusal: input.existingRefusal ?? false,
        attachments: input.attachments ?? null,
        status: 'NEW',
        internalStatus: duplicateCheck.isDuplicate ? 'POSSIBLE_DUPLICATE' : 'SUBMITTED',
        duplicateFlag: duplicateCheck.isDuplicate,
        assignedAdvisor: 'V-Visa Advisor Desk',
        nextAction: duplicateCheck.isDuplicate
          ? 'Admissions team verifying referral ownership'
          : 'Initial contact and document assessment',
        rewardAmountMinor,
        rewardStatus: 'ESTIMATED',
        rewardRuleId,
        rewardCondition,
      },
      include: {
        product: { select: { id: true, name: true, destination: true, category: true } },
      },
    });

    await tx.referralEvent.create({
      data: {
        referralId: created.id,
        stage: 'NEW',
        event: 'Referral Submitted',
        actor: input.actor ?? 'Partner',
        partnerVisibleNote: duplicateCheck.isDuplicate
          ? 'Referral submitted. System is validating application details.'
          : `Referral registered for ${product.name}. Assigned to V-Visa Advisor Desk.`,
        internalNote: duplicateCheck.isDuplicate
          ? `Duplicate detected against ${duplicateCheck.matchedSource}`
          : 'Clean submission from partner portal.',
        nextAction: created.nextAction,
      },
    });

    return created;
  });

  return {
    referral,
    duplicateWarning: duplicateCheck.isDuplicate
      ? 'This client may already exist in our system. Our team will verify referral ownership.'
      : null,
  };
}

/**
 * Retrieves referrals and aggregated KPI stats for a partner agency.
 */
export async function getPartnerReferrals(params: {
  partnerAgencyId: string;
  search?: string;
  status?: string;
  rewardStatus?: string;
  country?: string;
}) {
  const where: any = { partnerAgencyId: params.partnerAgencyId };

  if (params.status && params.status !== 'all') {
    where.status = params.status as ReferralStatus;
  }

  if (params.rewardStatus && params.rewardStatus !== 'all') {
    where.rewardStatus = params.rewardStatus as ReferralRewardStatus;
  }

  if (params.country && params.country !== 'all') {
    where.clientCountry = { equals: params.country, mode: 'insensitive' };
  }

  if (params.search) {
    const q = params.search.trim();
    where.OR = [
      { referralCode: { contains: q, mode: 'insensitive' } },
      { clientName: { contains: q, mode: 'insensitive' } },
      { clientEmail: { contains: q, mode: 'insensitive' } },
      { clientMobile: { contains: q } },
      { product: { name: { contains: q, mode: 'insensitive' } } },
      { product: { destination: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [referrals, allPartnerReferrals] = await Promise.all([
    db.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, destination: true, category: true, amountMinor: true } },
      },
    }),
    db.referral.findMany({
      where: { partnerAgencyId: params.partnerAgencyId },
      select: {
        id: true,
        status: true,
        rewardStatus: true,
        rewardAmountMinor: true,
        rewardCreditedAt: true,
        createdAt: true,
        productId: true,
        product: { select: { name: true } },
      },
    }),
  ]);

  // Aggregate KPI Statistics
  const totalReferrals = allPartnerReferrals.length;
  let countNew = 0;
  let countContacted = 0;
  let countOnboarded = 0;
  let countInProgress = 0;
  let countCompleted = 0;
  let countClosed = 0;

  let pendingEarningsMinor = 0;
  let approvedEarningsMinor = 0;
  let totalEarnedMinor = 0;
  let thisMonthEarningsMinor = 0;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const productCounts: Record<string, number> = {};

  for (const r of allPartnerReferrals) {
    // Status counts
    if (r.status === 'NEW') countNew++;
    else if (r.status === 'CONTACTED') countContacted++;
    else if (r.status === 'ONBOARDED') countOnboarded++;
    else if (r.status === 'IN_PROGRESS') countInProgress++;
    else if (r.status === 'COMPLETED') countCompleted++;
    else if (r.status === 'CLOSED') countClosed++;

    // Earnings
    if (r.rewardStatus === 'ESTIMATED' || r.rewardStatus === 'PENDING') {
      pendingEarningsMinor += r.rewardAmountMinor;
    } else if (r.rewardStatus === 'APPROVED') {
      approvedEarningsMinor += r.rewardAmountMinor;
    } else if (r.rewardStatus === 'CREDITED') {
      totalEarnedMinor += r.rewardAmountMinor;
      if (r.rewardCreditedAt) {
        const d = new Date(r.rewardCreditedAt);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          thisMonthEarningsMinor += r.rewardAmountMinor;
        }
      }
    }

    // Top product
    const pName = r.product?.name ?? 'Visa Service';
    productCounts[pName] = (productCounts[pName] || 0) + 1;
  }

  let topProduct = 'All-Round Services';
  let topProductMax = 0;
  for (const [pName, count] of Object.entries(productCounts)) {
    if (count > topProductMax) {
      topProductMax = count;
      topProduct = pName;
    }
  }

  const conversionRate = totalReferrals > 0 ? Math.round((countCompleted / totalReferrals) * 100) : 0;

  return {
    referrals,
    stats: {
      totalReferrals,
      new: countNew,
      contacted: countContacted,
      onboarded: countOnboarded,
      inProgress: countInProgress,
      completed: countCompleted,
      closed: countClosed,
      pendingEarningsMinor,
      approvedEarningsMinor,
      totalEarnedMinor,
      conversionRate,
      thisMonthEarningsMinor,
      topProduct,
      needsActionCount: referrals.filter((r) => Boolean(r.nextAction && r.status !== 'COMPLETED' && r.status !== 'CLOSED')).length,
    },
  };
}

/**
 * Retrieves a single referral's details with timeline for partner view.
 */
export async function getReferralDetail(referralId: string, partnerAgencyId: string) {
  const referral = await db.referral.findFirst({
    where: { id: referralId, partnerAgencyId },
    include: {
      product: true,
      events: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          stage: true,
          event: true,
          actor: true,
          partnerVisibleNote: true,
          nextAction: true,
          createdAt: true,
        },
      },
    },
  });

  return referral;
}

/**
 * Gets or creates public referral links for a partner.
 */
export async function getPartnerReferralLinks(partnerAgencyId: string, partnerUid: string) {
  let mainLink = await db.referralLink.findFirst({
    where: { partnerAgencyId, productId: null },
  });

  if (!mainLink) {
    mainLink = await db.referralLink.create({
      data: {
        code: partnerUid,
        partnerAgencyId,
        partnerUid,
        productId: null,
      },
    });
  }

  return {
    mainLink,
    baseUrl: process.env.APP_URL || 'https://business.vvisa.in',
    publicUrl: `${process.env.APP_URL || 'https://business.vvisa.in'}/r/${partnerUid}`,
  };
}

/**
 * Credits referral reward to partner's wallet idempotently.
 */
export async function creditReferralReward(referralId: string, actorEmail = 'V-Visa Finance') {
  const referral = await db.referral.findUnique({
    where: { id: referralId },
    include: { agency: true, product: true },
  });

  if (!referral) throw new Error('Referral not found');
  if (referral.rewardStatus === 'CREDITED') {
    return { success: true, message: 'Reward already credited', referral };
  }

  const idempotencyKey = `referral-reward-${referral.id}`;
  const now = new Date();

  const result = await db.$transaction(async (tx) => {
    // 1. Create wallet credit ledger entry
    const entry = await createLedgerEntry(
      {
        agencyId: referral.partnerAgencyId,
        referralId: referral.id,
        type: 'REFERRAL_REWARD',
        amountMinor: referral.rewardAmountMinor,
        currency: referral.product.currency ?? 'INR',
        idempotencyKey,
        description: `Referral Reward: ${referral.product.name} (Client: ${referral.clientName}, Ref: ${referral.referralCode})`,
      },
      tx,
    );

    // 2. Update referral record
    const updatedReferral = await tx.referral.update({
      where: { id: referral.id },
      data: {
        rewardStatus: 'CREDITED',
        rewardCreditedAt: now,
        status: referral.status === 'CLOSED' ? 'CLOSED' : 'COMPLETED',
        nextAction: 'Reward successfully credited to wallet',
      },
      include: { product: true, agency: true },
    });

    // 4. Create timeline event
    await tx.referralEvent.create({
      data: {
        referralId: referral.id,
        stage: 'COMPLETED',
        event: 'Reward Credited',
        actor: actorEmail,
        partnerVisibleNote: `Referral reward of ₹${(referral.rewardAmountMinor / 100).toLocaleString('en-IN')} credited to wallet.`,
        nextAction: 'Completed',
      },
    });

    return { updatedReferral, entry };
  });

  return { success: true, ...result };
}
