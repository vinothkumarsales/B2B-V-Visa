export type SupplierId = "stampmyvisa" | "stamp-my-visa" | "atlys-b2b" | (string & {});
export type VisaKind =
  | "STICKER_VISA"
  | "E_VISA"
  | "ETA"
  | "VISA_ON_ARRIVAL"
  | "OTHER"
  | "REVIEW_REQUIRED"
  | "tourist"
  | "business"
  | "transit"
  | "student"
  | "work"
  | "evisa"
  | "unknown";
export type EntryType = "SINGLE" | "MULTIPLE" | "DOUBLE" | "NOT_SPECIFIED" | "single" | "multiple" | "double" | "unknown";
export type ImportMode = "saved-html" | "live";
export type DocumentStatus =
  | "MANDATORY"
  | "CONDITIONAL"
  | "OPTIONAL"
  | "INFORMATIONAL"
  | "REVIEW_REQUIRED";
export type ReviewStatus =
  | "EXTRACTED"
  | "NORMALIZED"
  | "REVIEW_REQUIRED"
  | "CONFLICT_REVIEW_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";
export type ChangeDetectionStatus =
  | "NEW_PRODUCT"
  | "NO_CHANGE"
  | "PRICE_CHANGED"
  | "DOCUMENTS_CHANGED"
  | "PROCESSING_CHANGED"
  | "ROUTING_CHANGED"
  | "PRODUCT_UNAVAILABLE"
  | "REVIEW_REQUIRED";
export type PassportValidityBasis =
  | "FROM_APPLICATION_DATE"
  | "FROM_TRAVEL_DATE"
  | "FROM_ARRIVAL_DATE"
  | "FROM_RETURN_DATE"
  | "FROM_DESTINATION_DEPARTURE"
  | "UNKNOWN";
export type PriceLineCode =
  | "VISA_FEE"
  | "VFS_FEE"
  | "SERVICE_FEE"
  | "COURIER_FEE"
  | "ROUTE_SERVICE_ADJUSTMENT"
  | "OTHER_FEE"
  | "DISCOUNT"
  | "GST";

export interface ClassificationEvidence {
  matchedText: string;
  sourceSection: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface SupplierDocumentInput {
  name: string;
  mandatory?: boolean;
  status?: DocumentStatus | string;
  condition?: string;
  note?: string;
  description?: string;
  sourceGroup?: string;
  sourceText?: string;
  uploadRequired?: boolean;
  originalRequired?: boolean;
  carryToAppointment?: boolean;
  courierRequired?: boolean;
  biometricRelated?: boolean;
  acceptedFormats?: string[];
}

export interface SupplierDocument {
  name: string;
  status: DocumentStatus;
  mandatory: boolean;
  condition: string | null;
  note: string | null;
  description?: string | null;
  sourceGroup?: string | null;
  sourceText?: string | null;
  uploadRequired?: boolean;
  originalRequired?: boolean;
  carryToAppointment?: boolean;
  courierRequired?: boolean;
  biometricRelated?: boolean;
  acceptedFormats: string[];
}

export interface SupplierPriceLineInput {
  code?: PriceLineCode | string;
  label?: string;
  amount?: number | string;
  currency?: string;
  included?: boolean;
  taxable?: boolean;
  perApplicant?: boolean;
}

export interface SupplierPriceLine {
  code: PriceLineCode;
  label: string;
  amount: number | null;
  currency: string;
  included: boolean;
  taxable: boolean;
  perApplicant: boolean;
}

export interface SupplierStickerRouteInput {
  id?: string;
  originCityCode?: string;
  originCityLabel?: string;
  processingCentreCity?: string;
  processingCentreAddress?: string;
  courierFeeMinor?: number | string;
  serviceFeeAdjustmentMinor?: number | string;
  estimatedOutboundDays?: number | string;
  estimatedReturnDays?: number | string;
  isActive?: boolean;
}

export interface NormalizedStickerRoute {
  id: string;
  visaProductId: string;
  originCityCode: string;
  originCityLabel: string;
  processingCentreCity: string;
  processingCentreAddress?: string;
  courierFeeMinor: number;
  serviceFeeAdjustmentMinor: number;
  estimatedOutboundDays?: number;
  estimatedReturnDays?: number;
  isActive: boolean;
}

export interface SupplierProductInput {
  supplierProductId?: string;
  sourceReference?: string;
  destinationCountry?: string;
  destinationIsoCode?: string;
  travelPurpose?: string;
  visaType?: string;
  visaCategory?: string;
  title?: string;
  entryType?: string;
  validityDays?: number | string;
  visaValidityLabel?: string;
  stayDays?: number | string;
  maximumStayLabel?: string;
  processingTime?: string;
  processingTimeMinDays?: number | string;
  processingTimeMaxDays?: number | string;
  minimumPassportValidityMonths?: number | string;
  passportValidityBasis?: PassportValidityBasis | string;
  rawPassportValidityRule?: string;
  passportValidityReviewRequired?: boolean;
  physicalSubmissionRequired?: boolean;
  originalPassportRequired?: boolean;
  biometricRequired?: boolean;
  appointmentRequired?: boolean;
  visaApplicationCentreRequired?: boolean;
  passportCollectionAvailable?: boolean;
  physicalSubmissionInstructions?: string;
  currency?: string;
  netPrice?: number | string;
  visaFeeMinor?: number | string;
  vfsFeeMinor?: number | string;
  supplierServiceFeeMinor?: number | string;
  courierFeeMinor?: number | string;
  otherFeeMinor?: number | string;
  gstMinor?: number | string;
  finalDisplayedTotalMinor?: number | string;
  available?: boolean;
  classificationEvidence?: ClassificationEvidence[];
  documents?: Array<string | SupplierDocumentInput>;
  stickerRequired?: boolean;
  courierRequired?: boolean;
  submissionCity?: string;
  collectionCity?: string;
  routeCities?: string[];
  stickerRoutes?: SupplierStickerRouteInput[];
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
  normalizedProductKey: string;
  identityHash: string;
  contentHash: string;
  commercialHash: string;
  documentsHash: string;
  processingHash: string;
  routingHash: string;
  supplierId: SupplierId;
  supplierName: string;
  supplierProductId: string;
  sourceReference: string | null;
  destinationCountry: string;
  destinationIsoCode: string | null;
  destinationSlug: string;
  travelPurpose: string | null;
  visaType: string;
  visaKind: VisaKind;
  visaCategory: string | null;
  visaTypeSlug: string;
  title: string;
  entryType: EntryType;
  validityDays: number | null;
  visaValidityLabel: string | null;
  stayDays: number | null;
  maximumStayLabel: string | null;
  durationLabel: string | null;
  processingTime: string | null;
  processingDaysMin: number | null;
  processingDaysMax: number | null;
  minimumPassportValidityMonths: number | null;
  passportValidityBasis: PassportValidityBasis;
  rawPassportValidityRule: string | null;
  passportValidityReviewRequired: boolean;
  physicalSubmissionRequired: boolean;
  originalPassportRequired: boolean;
  biometricRequired: boolean;
  appointmentRequired: boolean;
  visaApplicationCentreRequired: boolean;
  passportCollectionAvailable: boolean;
  physicalSubmissionInstructions: string | null;
  currency: string;
  netPrice: number | null;
  visaFeeMinor: number;
  vfsFeeMinor: number;
  supplierServiceFeeMinor: number;
  courierFeeMinor: number;
  otherFeeMinor: number;
  gstMinor: number;
  finalDisplayedTotalMinor: number;
  pricingCapturedAt: string;
  available: boolean | null;
  classificationEvidence: ClassificationEvidence[];
  documents: SupplierDocument[];
  mandatoryDocuments: SupplierDocument[];
  conditionalDocuments: SupplierDocument[];
  optionalDocuments: SupplierDocument[];
  informationalDocuments: SupplierDocument[];
  reviewRequiredDocuments: SupplierDocument[];
  stickerRequired: boolean | null;
  courierRequired: boolean | null;
  submissionCity: string | null;
  collectionCity: string | null;
  routeCities: string[];
  stickerRoutes: NormalizedStickerRoute[];
  routingSummary: string | null;
  priceLines: SupplierPriceLine[];
  sourceUrl: string | null;
  sourceCapturedAt: string;
  sourceLastCheckedAt: string;
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
