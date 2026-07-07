-- Careers Phase 2B: checkout provider references and idempotent attempt metadata only.
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "providerMode" TEXT NOT NULL DEFAULT 'fixture';
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "providerCheckoutId" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "providerPaymentIntentId" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "checkoutCreatedAt" TIMESTAMP(3);
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "failureCode" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "failureMessageSafe" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "attemptGroupKey" TEXT;
ALTER TABLE "CareerPaymentIntent" ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "CareerPaymentIntent_attemptGroupKey_attemptNumber_idx" ON "CareerPaymentIntent"("attemptGroupKey", "attemptNumber");
