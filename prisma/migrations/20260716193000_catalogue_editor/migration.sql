ALTER TABLE "VisaProduct"
  ADD COLUMN "publicTitle" TEXT,
  ADD COLUMN "internalCode" TEXT,
  ADD COLUMN "subcategory" TEXT,
  ADD COLUMN "expressProcessingTime" TEXT,
  ADD COLUMN "badges" JSONB,
  ADD COLUMN "shortDescription" TEXT,
  ADD COLUMN "detailedDescription" TEXT,
  ADD COLUMN "importantNotes" TEXT,
  ADD COLUMN "eligibility" TEXT,
  ADD COLUMN "refundPolicy" TEXT,
  ADD COLUMN "cancellationPolicy" TEXT,
  ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "VisaProduct_internalCode_key" ON "VisaProduct"("internalCode");

ALTER TABLE "VisaDocumentRequirement"
  ADD COLUMN "requirementType" TEXT NOT NULL DEFAULT 'required',
  ADD COLUMN "acceptedFormats" JSONB,
  ADD COLUMN "maximumFileSizeBytes" INTEGER,
  ADD COLUMN "sampleDocumentUrl" TEXT,
  ADD COLUMN "templateDocumentUrl" TEXT,
  ADD COLUMN "translationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notarisationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "apostilleRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attestationRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "internalVerificationNote" TEXT;

ALTER TABLE "VisaPrice"
  ADD COLUMN "adultPriceMinor" INTEGER,
  ADD COLUMN "childPriceMinor" INTEGER,
  ADD COLUMN "infantPriceMinor" INTEGER,
  ADD COLUMN "supplierCostMinor" INTEGER,
  ADD COLUMN "markupMinor" INTEGER,
  ADD COLUMN "suggestedB2cMinor" INTEGER,
  ADD COLUMN "entryType" TEXT,
  ADD COLUMN "processingType" TEXT,
  ADD COLUMN "travellerType" TEXT;
