-- Careers Phase 2D: subscription/service activation and durable handoff only.
ALTER TABLE "CareerSubscription" ADD COLUMN "paymentIntentId" TEXT;
ALTER TABLE "CareerSubscription" ADD COLUMN "packageName" TEXT;
ALTER TABLE "CareerSubscription" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "CareerSubscription" ADD COLUMN "pricingSnapshotId" TEXT;

CREATE UNIQUE INDEX "CareerSubscription_paymentIntentId_key" ON "CareerSubscription"("paymentIntentId");
CREATE INDEX "CareerSubscription_paymentIntentId_idx" ON "CareerSubscription"("paymentIntentId");

CREATE TABLE "CareerActivationHandoff" (
  "id" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL DEFAULT 'career_subscription_activated',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "idempotencyKey" TEXT NOT NULL,
  "correlationId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "failureCode" TEXT,
  "failureMessageSafe" TEXT,
  "payloadVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareerActivationHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerActivationHandoff_idempotencyKey_key" ON "CareerActivationHandoff"("idempotencyKey");
CREATE INDEX "CareerActivationHandoff_status_nextAttemptAt_idx" ON "CareerActivationHandoff"("status", "nextAttemptAt");
CREATE INDEX "CareerActivationHandoff_paymentIntentId_status_idx" ON "CareerActivationHandoff"("paymentIntentId", "status");

ALTER TABLE "CareerSubscription" ADD CONSTRAINT "CareerSubscription_paymentIntentId_fkey"
  FOREIGN KEY ("paymentIntentId") REFERENCES "CareerPaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerActivationHandoff" ADD CONSTRAINT "CareerActivationHandoff_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "CareerCandidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerActivationHandoff" ADD CONSTRAINT "CareerActivationHandoff_serviceRequestId_fkey"
  FOREIGN KEY ("serviceRequestId") REFERENCES "CareerServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerActivationHandoff" ADD CONSTRAINT "CareerActivationHandoff_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "CareerSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerActivationHandoff" ADD CONSTRAINT "CareerActivationHandoff_paymentIntentId_fkey"
  FOREIGN KEY ("paymentIntentId") REFERENCES "CareerPaymentIntent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
