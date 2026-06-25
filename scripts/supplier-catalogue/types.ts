export type SupplierId = "stampmyvisa" | "stamp-my-visa" | "atlys-b2b" | (string & {});
export type VisaKind =
  | "tourist"
  | "business"
  | "transit"
  | "student"
  | "work"
  | "evisa"
  | "unknown";
export type EntryType = "single" | "multiple" | "double" | "unknown";
export type ImportMode = "sample" | "local" | "saved-html" | "live";
export type ReviewStatus = "ready_for_review" | "needs_review" | "rejected";
export type ChangeDetectionStatus =
  | "NEW_PRODUCT"
  | "NO_CHANGE"
  | "PRICE_CHANGED"
  | "CONTENT_CHANGED"
  | "REMOVED_PRODUCT"
  | "NEEDS_REVIEW";

export interface SupplierDocumentInput {
  name: string;
  mandatory?: boolean;
  note?: string;
  acceptedFormats?: string[];
}

export interface SupplierDocument {
  name: string;
  mandatory: boolean;
  note: string | null;
  acceptedFormats: string[];
}

export interface SupplierPriceLineInput {
  label?: string;
  amount?: number | string;
  currency?: string;
  included?: boolean;
}

export interface SupplierPriceLine {
  label: string;
  amount: number | null;
  currency: string;
  included: boolean;
}

export interface SupplierProductInput {
  supplierProductId?: string;
  destinationCountry?: string;
  visaType?: string;
  title?: string;
  entryType?: string;
  validityDays?: number | string;
  stayDays?: number | string;
  processingTime?: string;
  currency?: string;
  netPrice?: number | string;
  documents?: Array<string | SupplierDocumentInput>;
  stickerRequired?: boolean;
  courierRequired?: boolean;
  submissionCity?: string;
  collectionCity?: string;
  routeCities?: string[];
  priceLines?: SupplierPriceLineInput[];
  sourceUrl?: string;
  raw?: unknown;
}

export interface SupplierImportSource {
  supplier: {
    id: SupplierId;
    name: string;
    source: string;
  };
  capturedAt: string;
  products: SupplierProductInput[];
}

export interface NormalizedSupplierProduct {
  catalogueKey: string;
  supplierId: SupplierId;
  supplierName: string;
  supplierProductId: string;
  destinationCountry: string;
  destinationSlug: string;
  visaType: string;
  visaKind: VisaKind;
  visaTypeSlug: string;
  title: string;
  entryType: EntryType;
  validityDays: number | null;
  stayDays: number | null;
  processingTime: string | null;
  currency: string;
  netPrice: number | null;
  documents: SupplierDocument[];
  mandatoryDocuments: SupplierDocument[];
  optionalDocuments: SupplierDocument[];
  stickerRequired: boolean | null;
  courierRequired: boolean | null;
  submissionCity: string | null;
  collectionCity: string | null;
  routeCities: string[];
  priceLines: SupplierPriceLine[];
  sourceUrl: string | null;
  sourceCapturedAt: string;
  sourceMode: ImportMode;
  importStatus: ReviewStatus;
  reviewStatus: ReviewStatus;
  changeDetectionStatus: ChangeDetectionStatus;
  reviewNotes: string[];
}

export interface ValidationIssue {
  level: "error" | "warning";
  field: string;
  message: string;
}

export interface ValidatedSupplierProduct {
  product: NormalizedSupplierProduct;
  issues: ValidationIssue[];
}

export interface DedupeResult {
  kept: ValidatedSupplierProduct[];
  duplicates: Array<{
    duplicate: ValidatedSupplierProduct;
    keptCatalogueKey: string;
    reason: string;
  }>;
}

export interface ReviewExport {
  metadata: {
    generatedAt: string;
    supplierId: SupplierId;
    destination: string;
    requestedLimit: number;
    sourceMode: ImportMode;
    sourceFile: string;
  };
  summary: {
    read: number;
    destinationMatched: number;
    exported: number;
    duplicateCount: number;
    errorCount: number;
    warningCount: number;
  };
  products: NormalizedSupplierProduct[];
  validation: Array<{
    catalogueKey: string;
    issues: ValidationIssue[];
  }>;
  duplicates: DedupeResult["duplicates"];
}
