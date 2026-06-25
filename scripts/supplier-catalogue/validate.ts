import type {
  NormalizedSupplierProduct,
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

    return {
      product: {
        ...product,
        importStatus: hasError
          ? "rejected"
          : hasWarning
            ? "needs_review"
            : "ready_for_review",
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

  if (product.destinationCountry === "Unknown") {
    issues.push({
      level: "error",
      field: "destinationCountry",
      message: "destination could not be normalized",
    });
  }

  if (product.netPrice === null || product.netPrice <= 0) {
    issues.push({
      level: "warning",
      field: "netPrice",
      message: "missing or non-positive net supplier price",
    });
  }

  if (product.entryType === "unknown") {
    issues.push({
      level: "warning",
      field: "entryType",
      message: "entry type needs manual review",
    });
  }

  if (product.visaKind === "unknown") {
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
