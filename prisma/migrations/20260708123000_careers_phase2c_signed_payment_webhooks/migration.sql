-- Careers Phase 2C: safe, idempotent payment webhook evidence only.
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "providerPaymentId" TEXT;
CREATE INDEX "CareerPaymentIntent_providerPaymentId_idx" ON "CareerPaymentIntent"("providerPaymentId");

CREATE TABLE "CareerPaymentWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "paymentIntentId" TEXT,
  "providerCheckoutId" TEXT,
  "providerPaymentIntentId" TEXT,
  "providerPaymentId" TEXT,
  "amountMinor" INTEGER,
  "currency" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingStatus" TEXT NOT NULL,
  "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
  "duplicate" BOOLEAN NOT NULL DEFAULT false,
  "safeReference" TEXT,
  "failureCode" TEXT,
  "failureMessageSafe" TEXT,
  "payloadChecksum" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CareerPaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerPaymentWebhookEvent_provider_providerEventId_key" ON "CareerPaymentWebhookEvent"("provider", "providerEventId");
CREATE INDEX "CareerPaymentWebhookEvent_paymentIntentId_receivedAt_idx" ON "CareerPaymentWebhookEvent"("paymentIntentId", "receivedAt");
CREATE INDEX "CareerPaymentWebhookEvent_processingStatus_receivedAt_idx" ON "CareerPaymentWebhookEvent"("processingStatus", "receivedAt");

ALTER TABLE "CareerPaymentWebhookEvent" ADD CONSTRAINT "CareerPaymentWebhookEvent_paymentIntentId_fkey"
  FOREIGN KEY ("paymentIntentId") REFERENCES "CareerPaymentIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
