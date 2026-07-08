import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { apiError } from '@/lib/api-response';
import { auditLog } from '@/server/audit/audit-log';
import { careersServiceActivationEnabled } from './feature-flags';
import { parsePaymentPricingSnapshot } from './activation-policy';

export type ActivationResult = {
  paymentIntentId: string;
  candidateId: string;
  serviceRequestId: string;
  subscriptionId: string;
  activationHandoffId: string;
  activationStatus: 'activated' | 'reused';
  reused: boolean;
  activatedAt: Date | null;
};

export async function activateCareerServiceFromPayment(input: {
  paymentIntentId: string;
  requestedBy?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}): Promise<ActivationResult> {
  if (!careersServiceActivationEnabled()) {
    throw apiError('FORBIDDEN', 'Careers subscription and service activation is disabled.', 403);
  }

  const idempotencyKey = input.idempotencyKey ?? `career-activation:${input.paymentIntentId}`;

  try {
    return await db.$transaction(async (tx) => {
      const existingHandoff = await tx.careerActivationHandoff.findUnique({
        where: { idempotencyKey },
      });
      if (existingHandoff) {
        return reuseActivation(existingHandoff, input.requestedBy ?? null);
      }

      const paymentIntent = await tx.careerPaymentIntent.findUnique({
        where: { id: input.paymentIntentId },
        include: {
          candidate: true,
          serviceRequest: {
            include: {
              subscriptions: { where: { status: 'active' }, take: 1 },
            },
          },
        },
      });

      if (!paymentIntent) {
        throw apiError('RESOURCE_NOT_FOUND', 'Career payment intent not found.', 404);
      }
      if (paymentIntent.status !== 'paid') {
        throw apiError('PAYMENT_NOT_CONFIRMED', 'Career payment is not captured.', 409);
      }
      if (paymentIntent.failureCode || paymentIntent.failureMessageSafe) {
        throw apiError('PAYMENT_NOT_CONFIRMED', 'Career payment has unresolved provider failure metadata.', 409);
      }

      const serviceRequest = paymentIntent.serviceRequest;
      const candidate = paymentIntent.candidate;
      if (serviceRequest.candidateId !== candidate.id || paymentIntent.candidateId !== candidate.id) {
        throw apiError('INVALID_INPUT', 'Career payment candidate does not match the service request.', 409);
      }
      if (paymentIntent.serviceRequestId !== serviceRequest.id) {
        throw apiError('INVALID_INPUT', 'Career payment does not match the service request.', 409);
      }
      if (serviceRequest.activationStatus === 'service_active') {
        const handoff = await tx.careerActivationHandoff.findFirst({
          where: { paymentIntentId: paymentIntent.id },
          orderBy: { createdAt: 'desc' },
        });
        if (handoff) return reuseActivation(handoff, input.requestedBy ?? null);
        throw apiError('CONFIRMATION_REQUIRED', 'Career service request is already active without an activation handoff.', 409);
      }
      const conflictingSubscription = serviceRequest.subscriptions[0];
      if (conflictingSubscription && conflictingSubscription.paymentIntentId !== paymentIntent.id) {
        throw apiError('CONFIRMATION_REQUIRED', 'Career service request already has an active subscription.', 409);
      }

      const snapshot = parsePaymentPricingSnapshot(paymentIntent.pricingSnapshot);
      if (!snapshot?.id) {
        throw apiError('INVALID_INPUT', 'Career payment pricing snapshot is missing.', 409);
      }
      if (snapshot.amountMinor !== paymentIntent.amountMinor) {
        throw apiError('PRICE_CHANGED', 'Career payment amount does not match the pricing snapshot.', 409);
      }
      if (snapshot.currency !== paymentIntent.currency) {
        throw apiError('PRICE_CHANGED', 'Career payment currency does not match the pricing snapshot.', 409);
      }
      if (snapshot.packageCode !== serviceRequest.packageCode) {
        throw apiError('PRICE_CHANGED', 'Career payment package does not match the service request.', 409);
      }

      const now = new Date();
      const subscription = await tx.careerSubscription.upsert({
        where: { paymentIntentId: paymentIntent.id },
        update: {
          status: 'active',
          startedAt: now,
          activatedAt: now,
          packageName: snapshot.packageName,
          pricingSnapshotId: snapshot.id,
        },
        create: {
          candidateId: candidate.id,
          serviceRequestId: serviceRequest.id,
          paymentIntentId: paymentIntent.id,
          status: 'active',
          packageCode: serviceRequest.packageCode,
          packageName: snapshot.packageName,
          currency: paymentIntent.currency,
          amountMinor: paymentIntent.amountMinor,
          startedAt: now,
          activatedAt: now,
          currentPeriodEnd: null,
          pricingSnapshotId: snapshot.id,
        },
      });

      await tx.careerServiceRequest.update({
        where: { id: serviceRequest.id },
        data: {
          status: 'payment_verified',
          paymentStatus: 'paid',
          activationStatus: 'service_active',
          dashboardStatus: 'Service active',
        },
      });

      await tx.careerCandidate.update({
        where: { id: candidate.id },
        data: { status: 'subscription_active' },
      });

      const handoff = await tx.careerActivationHandoff.create({
        data: {
          candidateId: candidate.id,
          serviceRequestId: serviceRequest.id,
          subscriptionId: subscription.id,
          paymentIntentId: paymentIntent.id,
          idempotencyKey,
          correlationId: input.correlationId ?? null,
          status: 'pending',
          eventType: 'career_subscription_activated',
          payloadVersion: 1,
        },
      });

      await writeActivationAudits({
        requestedBy: input.requestedBy ?? null,
        candidateId: candidate.id,
        serviceRequestId: serviceRequest.id,
        paymentIntentId: paymentIntent.id,
        subscriptionId: subscription.id,
        handoffId: handoff.id,
        packageCode: serviceRequest.packageCode,
      });

      return {
        paymentIntentId: paymentIntent.id,
        candidateId: candidate.id,
        serviceRequestId: serviceRequest.id,
        subscriptionId: subscription.id,
        activationHandoffId: handoff.id,
        activationStatus: 'activated',
        reused: false,
        activatedAt: subscription.activatedAt,
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const handoff = await db.careerActivationHandoff.findUnique({ where: { idempotencyKey } });
      if (handoff) return reuseActivation(handoff, input.requestedBy ?? null);
    }
    throw error;
  }
}

async function reuseActivation(
  handoff: {
    id: string;
    candidateId: string;
    serviceRequestId: string;
    subscriptionId: string;
    paymentIntentId: string;
  },
  requestedBy: string | null,
): Promise<ActivationResult> {
  const subscription = await db.careerSubscription.findUnique({ where: { id: handoff.subscriptionId } });
  await auditLog({
    actorUserId: requestedBy,
    action: 'career_activation_reused',
    resourceType: 'CareerActivationHandoff',
    resourceId: handoff.id,
    metadata: {
      candidateId: handoff.candidateId,
      serviceRequestId: handoff.serviceRequestId,
      subscriptionId: handoff.subscriptionId,
      paymentIntentId: handoff.paymentIntentId,
    },
  });
  return {
    paymentIntentId: handoff.paymentIntentId,
    candidateId: handoff.candidateId,
    serviceRequestId: handoff.serviceRequestId,
    subscriptionId: handoff.subscriptionId,
    activationHandoffId: handoff.id,
    activationStatus: 'reused',
    reused: true,
    activatedAt: subscription?.activatedAt ?? null,
  };
}

async function writeActivationAudits(input: {
  requestedBy: string | null;
  candidateId: string;
  serviceRequestId: string;
  paymentIntentId: string;
  subscriptionId: string;
  handoffId: string;
  packageCode: string;
}) {
  await auditLog({
    actorUserId: input.requestedBy,
    action: 'career_subscription_activated',
    resourceType: 'CareerSubscription',
    resourceId: input.subscriptionId,
    metadata: input,
  });
  await auditLog({
    actorUserId: input.requestedBy,
    action: 'career_service_request_activated',
    resourceType: 'CareerServiceRequest',
    resourceId: input.serviceRequestId,
    metadata: input,
  });
  await auditLog({
    actorUserId: input.requestedBy,
    action: 'career_activation_handoff_created',
    resourceType: 'CareerActivationHandoff',
    resourceId: input.handoffId,
    metadata: {
      ...input,
      handoffStatus: 'pending',
    },
  });
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
