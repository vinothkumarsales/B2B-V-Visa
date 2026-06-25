export type SupplierId = "stampmyvisa" | (string & {});
export type EntryType = "single" | "multiple" | "unknown";
export type ImportMode = "sample" | "local";

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
  documents?: string[];
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
  visaTypeSlug: string;
  title: string;
  entryType: EntryType;
  validityDays: number | null;
  stayDays: number | null;
  processingTime: string | null;
  currency: string;
  netPrice: number | null;
  documents: string[];
  sourceUrl: string | null;
  sourceCapturedAt: string;
  sourceMode: ImportMode;
  importStatus: "ready_for_review" | "needs_review" | "rejected";
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
