import type { DedupeResult, ValidatedSupplierProduct } from "./types.ts";

export function dedupeProducts(products: ValidatedSupplierProduct[]): DedupeResult {
  const byCatalogueKey = new Map<string, ValidatedSupplierProduct>();
  const duplicates: DedupeResult["duplicates"] = [];

  for (const item of products) {
    const existing = byCatalogueKey.get(item.product.catalogueKey);
    if (!existing) {
      byCatalogueKey.set(item.product.catalogueKey, item);
      continue;
    }

    const winner = markConflict(chooseWinner(existing, item));
    const loser = markConflict(winner === existing ? item : existing);
    byCatalogueKey.set(item.product.catalogueKey, winner);
    duplicates.push({
      duplicate: loser,
      keptCatalogueKey: winner.product.catalogueKey,
      reason: duplicateReason(existing, item),
    });
  }

  return {
    kept: Array.from(byCatalogueKey.values()),
    duplicates,
  };
}

function chooseWinner(
  left: ValidatedSupplierProduct,
  right: ValidatedSupplierProduct,
): ValidatedSupplierProduct {
  return score(right) > score(left) ? right : left;
}

function markConflict(item: ValidatedSupplierProduct): ValidatedSupplierProduct {
  return {
    ...item,
    product: {
      ...item.product,
      reviewStatus: "CONFLICT_REVIEW_REQUIRED",
      importStatus: "CONFLICT_REVIEW_REQUIRED",
      reviewNotes: Array.from(new Set([
        ...item.product.reviewNotes,
        "warning: catalogueKey - duplicate supplier product identity requires review",
      ])),
    },
  };
}

function duplicateReason(left: ValidatedSupplierProduct, right: ValidatedSupplierProduct): string {
  if (left.product.contentHash !== right.product.contentHash) {
    return "same deterministic identity but normalized content differs";
  }
  return "same supplier, destination, visa type, stay duration, and entry type";
}

function score(item: ValidatedSupplierProduct): number {
  const errorPenalty = item.issues.filter((issue) => issue.level === "error").length * 10;
  const warningPenalty = item.issues.filter((issue) => issue.level === "warning").length * 2;
  const completeness = [
    item.product.netPrice,
    item.product.validityDays,
    item.product.stayDays,
    item.product.processingTime,
    item.product.sourceUrl,
    item.product.documents.length > 0 ? item.product.documents.length : null,
  ].filter((value) => value !== null).length;

  return completeness - errorPenalty - warningPenalty;
}
