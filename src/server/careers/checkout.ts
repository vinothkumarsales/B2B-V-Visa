import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { env } from '@/lib/env';
import type { Prisma } from '@prisma/client';
import { auditLog } from '@/server/audit/audit-log';
import { careersFeatureEnabled } from './feature-flags';
import { resolveCareersPaymentProvider } from './checkout-provider';
import {
  buildCareerCheckoutAttemptGroupKey,
  canReuseCareerCheckout,
  canReuseCareerPaymentIntentDraft,
} from './checkout-policy';
import { normalizeCareerCurrency } from './packages';

export type CreateCareerCheckoutInput = {
  userId: string;
  serviceRequestId: string;
  packageCode: 'EUROPE_JOB_SEARCH_ASSIST' | 'EUROPE_JOB_SEARCH_PRO' | 'EUROPE_JOB_SEARCH_PREMIUM';
  currency?: string;
};

export async function createCareerCheckout(input: CreateCareerCheckoutInput) {
  assertCheckoutEnabled();
  const currency = normalizeCareerCurrency(input.currency);
  const origin = trustedAppOrigin();
  const provider = resolveCareersPaymentProvider();

  const prepared = await db.$transaction(async (tx) => {
    const serviceRequest = await tx.careerServiceRequest.findFirst({
      where: {
        id: input.serviceRequestId,
        packageCode: input.packageCode,
        candidate: { userId: input.userId },
      },
      include: {
        candidate: true,
        subscriptions: { where: { status: 'active' }, take: 1 },
      },
    });

    if (!serviceRequest) {
      throw apiError('RESOURCE_NOT_FOUND', 'Career service request not found.', 404);
    }
    if (serviceRequest.subscriptions[0]) {
      throw apiError('CONFIRMATION_REQUIRED', 'Candidate already has an active Careers subscription.', 409);
    }

    const selectedPackage = await tx.careerServicePackage.findUnique({
      where: { code: input.packageCode },
      include: { prices: { where: { currency, isActive: true }, take: 1 } },
    });
    if (!selectedPackage || selectedPackage.status !== 'active' || !selectedPackage.isPublic) {
      throw apiError('INVALID_INPUT', 'Selected Careers package is not available.', 400);
    }
    const price = selectedPackage.prices[0];
    if (!price || price.amountMinor <= 0) {
      throw apiError('PRICE_CHANGED', 'Selected Careers package price is not available.', 409);
    }
    if (serviceRequest.packageId && serviceRequest.packageId !== selectedPackage.id) {
      throw apiError('PRICE_CHANGED', 'Selected Careers package no longer matches the service request.', 409);
    }

    const pricingSnapshot = await tx.careerPricingSnapshot.create({
      data: {
        serviceRequestId: serviceRequest.id,
        packageCode: selectedPackage.code,
        packageName: selectedPackage.name,
        currency,
        amountMinor: price.amountMinor,
        billingMode: price.billingMode,
        features: toJsonArray(selectedPackage.features),
        quotas: toJsonObject(selectedPackage.quotas),
        sourcePriceId: price.id,
      },
    });

    const attemptGroupKey = buildCareerCheckoutAttemptGroupKey({
      candidateId: serviceRequest.candidateId,
      serviceRequestId: serviceRequest.id,
      packageCode: selectedPackage.code,
      currency,
    });
    const latestIntent = await tx.careerPaymentIntent.findFirst({
      where: { attemptGroupKey },
      orderBy: { attemptNumber: 'desc' },
    });
    const now = new Date();
    if (canReuseCareerCheckout(latestIntent, now)) {
      return { serviceRequest, candidate: serviceRequest.candidate, pricingSnapshot, paymentIntent: latestIntent!, reused: true as const };
    }

    const canReuse = canReuseCareerPaymentIntentDraft({
      intent: latestIntent,
      amountMinor: price.amountMinor,
      currency,
    });

    const paymentIntent = canReuse
      ? await tx.careerPaymentIntent.update({
          where: { id: latestIntent!.id },
          data: {
            status: 'awaiting_checkout',
            pricingSnapshot: checkoutPricingReference(pricingSnapshot),
            failureCode: null,
            failureMessageSafe: null,
          },
        })
      : await tx.careerPaymentIntent.create({
          data: {
            candidateId: serviceRequest.candidateId,
            serviceRequestId: serviceRequest.id,
            status: 'awaiting_checkout',
            provider: provider.id,
            providerMode: env.CAREERS_PAYMENT_MODE,
            amountMinor: price.amountMinor,
            currency,
            idempotencyKey: `${attemptGroupKey}:${(latestIntent?.attemptNumber ?? 0) + 1}`,
            attemptGroupKey,
            attemptNumber: (latestIntent?.attemptNumber ?? 0) + 1,
            pricingSnapshot: checkoutPricingReference(pricingSnapshot),
          },
        });

    return { serviceRequest, candidate: serviceRequest.candidate, pricingSnapshot, paymentIntent, reused: false as const };
  });

  if (prepared.reused && prepared.paymentIntent.checkoutUrl) {
    await auditCheckout('career_checkout_reused', input.userId, prepared, provider.id);
    return sanitizedCheckout(prepared.paymentIntent, provider.id, env.CAREERS_PAYMENT_MODE, true);
  }

  try {
    const checkout = await provider.createCheckout({
      paymentIntentId: prepared.paymentIntent.id,
      candidateId: prepared.candidate.id,
      serviceRequestId: prepared.serviceRequest.id,
      packageCode: prepared.serviceRequest.packageCode,
      amountMinor: prepared.paymentIntent.amountMinor,
      currency,
      customer: {
        name: prepared.candidate.fullName,
        email: prepared.candidate.email,
        phone: prepared.candidate.phone,
      },
      successUrl: `${origin}/careers/dashboard?checkout=success`,
      cancelUrl: `${origin}/careers/dashboard?checkout=cancelled`,
      idempotencyKey: prepared.paymentIntent.idempotencyKey,
      metadata: {
        candidateId: prepared.candidate.id,
        serviceRequestId: prepared.serviceRequest.id,
        pricingSnapshotId: prepared.pricingSnapshot.id,
      },
    });

    const updated = await db.careerPaymentIntent.update({
      where: { id: prepared.paymentIntent.id },
      data: {
        status: 'checkout_created',
        provider: checkout.provider,
        providerMode: checkout.mode,
        providerCheckoutId: checkout.providerCheckoutId,
        providerPaymentIntentId: checkout.providerPaymentIntentId,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: checkout.expiresAt,
        checkoutCreatedAt: new Date(),
      },
    });

    await auditCheckout('career_checkout_created', input.userId, { ...prepared, paymentIntent: updated }, provider.id);
    return sanitizedCheckout(updated, checkout.provider, checkout.mode, false);
  } catch {
    const failed = await db.careerPaymentIntent.update({
      where: { id: prepared.paymentIntent.id },
      data: {
        status: 'failed',
        failureCode: 'CHECKOUT_PROVIDER_FAILED',
        failureMessageSafe: 'Unable to create checkout. Please try again.',
      },
    });
    await auditCheckout('career_checkout_failed', input.userId, { ...prepared, paymentIntent: failed }, provider.id);
    throw apiError('PROVIDER_UNAVAILABLE', 'Unable to create Careers checkout.', 503);
  }
}

function assertCheckoutEnabled() {
  const required = [
    'CAREERS_SAAS_ENABLED',
    'CAREERS_PACKAGES_ENABLED',
    'CAREERS_PAYMENTS_ENABLED',
    'CAREERS_CHECKOUT_ENABLED',
  ] as const;
  if (!required.every((flag) => careersFeatureEnabled(flag))) {
    throw apiError('FORBIDDEN', 'Careers checkout is currently disabled.', 403);
  }
}

function checkoutPricingReference(snapshot: {
  id: string;
  packageCode: string;
  packageName: string;
  amountMinor: number;
  currency: string;
  billingMode: string;
}) {
  return {
    id: snapshot.id,
    packageCode: snapshot.packageCode,
    packageName: snapshot.packageName,
    amountMinor: snapshot.amountMinor,
    currency: snapshot.currency,
    billingMode: snapshot.billingMode,
  };
}

function toJsonArray(value: unknown): Prisma.InputJsonArray {
  return Array.isArray(value) ? value as Prisma.InputJsonArray : [];
}

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Prisma.InputJsonObject : {};
}

function sanitizedCheckout(intent: {
  id: string;
  status: string;
  providerCheckoutId: string | null;
  checkoutUrl: string | null;
  expiresAt: Date | null;
  amountMinor: number;
  currency: string;
}, provider: string, mode: string, reused: boolean) {
  return {
    paymentIntent: {
      id: intent.id,
      status: intent.status,
      amountMinor: intent.amountMinor,
      currency: intent.currency,
      provider,
      mode,
      providerCheckoutId: intent.providerCheckoutId,
      checkoutUrl: intent.checkoutUrl,
      expiresAt: intent.expiresAt,
      reused,
    },
  };
}

function trustedAppOrigin() {
  const value = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw apiError('PRODUCTION_CONFIGURATION_REQUIRED', 'Invalid application URL configuration.', 500);
  }
  return url.origin;
}

async function auditCheckout(
  action: string,
  actorUserId: string,
  prepared: {
    serviceRequest: { id: string; packageCode: string };
    candidate: { id: string };
    paymentIntent: { id: string; status: string; currency: string };
  },
  provider: string,
) {
  await auditLog({
    actorUserId,
    action,
    resourceType: 'CareerPaymentIntent',
    resourceId: prepared.paymentIntent.id,
    metadata: {
      candidateId: prepared.candidate.id,
      serviceRequestId: prepared.serviceRequest.id,
      packageCode: prepared.serviceRequest.packageCode,
      currency: prepared.paymentIntent.currency,
      provider,
      status: prepared.paymentIntent.status,
    },
  });
}
