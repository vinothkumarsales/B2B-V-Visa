import type {
  NormalizedSupplierProduct,
  ReviewStatus,
  ValidatedSupplierProduct,
  ValidationIssue,
} from "./types.ts";

export function validateProducts(
  products: NormalizedSupplierProduct[],
): ValidatedSupplierProduct[] {
  return products.map((product) => {
    const issues = validateProduct(product);
    const hasError = issues.some((issue) => issue.level === "error");
    const hasWarning = issues.some((issue) => issue.level === "warning");
    const reviewStatus: ReviewStatus = hasError
      ? "REJECTED"
      : hasWarning
        ? "REVIEW_REQUIRED"
        : "NORMALIZED";

    return {
      product: {
        ...product,
        importStatus: reviewStatus,
        reviewStatus,
        reviewNotes: issues.map((issue) => `${issue.level}: ${issue.field} - ${issue.message}`),
      },
      issues,
    };
  });
}

function validateProduct(product: NormalizedSupplierProduct): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  requireText(issues, product.destinationCountry, "destinationCountry");
  requireText(issues, product.visaType, "visaType");
  requireText(issues, product.title, "title");
  requireText(issues, product.supplierProductId, "supplierProductId");
  requireText(issues, product.identityHash, "identityHash");
  requireText(issues, product.contentHash, "contentHash");

  if (product.destinationCountry === "Unknown") {
    issues.push({
      level: "error",
      field: "destinationCountry",
      message: "destination could not be normalized",
    });
  }

  if (product.available === false) {
    issues.push({
      level: "warning",
      field: "available",
      message: "supplier product is marked unavailable",
    });
  }

  if (product.netPrice === null || product.netPrice <= 0) {
    issues.push({
      level: "warning",
      field: "netPrice",
      message: "missing or non-positive net supplier price",
    });
  }

  if (product.entryType === "NOT_SPECIFIED") {
    issues.push({
      level: "warning",
      field: "entryType",
      message: "entry type needs manual review",
    });
  }

  if (product.visaKind === "REVIEW_REQUIRED") {
    issues.push({
      level: "warning",
      field: "visaKind",
      message: "visa kind needs manual review",
    });
  }

  if (product.documents.length === 0) {
    issues.push({
      level: "warning",
      field: "documents",
      message: "document checklist is empty",
    });
  }

  if (product.reviewRequiredDocuments.length > 0) {
    issues.push({
      level: "warning",
      field: "documents",
      message: "one or more documents need status review",
    });
  }

  if (product.conditionalDocuments.some((document) => !document.condition)) {
    issues.push({
      level: "warning",
      field: "documents.condition",
      message: "conditional document is missing its condition",
    });
  }

  if (product.processingTime && (product.processingDaysMin === null || product.processingDaysMax === null)) {
    issues.push({
      level: "warning",
      field: "processingTime",
      message: "processing time could not be parsed into a numeric window",
    });
  }

  if (product.priceLines.some((line) => line.amount !== null && line.amount < 0)) {
    issues.push({
      level: "warning",
      field: "priceLines",
      message: "negative price line needs manual review",
    });
  }

  return issues;
}

function requireText(
  issues: ValidationIssue[],
  value: string,
  field: string,
): void {
  if (!value.trim()) {
    issues.push({
      level: "error",
      field,
      message: "required field is missing",
    });
  }
}
