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

    const winner = chooseWinner(existing, item);
    const loser = winner === existing ? item : existing;
    byCatalogueKey.set(item.product.catalogueKey, winner);
    duplicates.push({
      duplicate: loser,
      keptCatalogueKey: winner.product.catalogueKey,
      reason: "same supplier, destination, visa type, stay duration, and entry type",
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

function score(item: ValidatedSupplierProduct): number {
  const errorPenalty = item.issues.filter((issue) => issue.level === "error").length * 10;
  const warningPenalty = item.issues.filter((issue) => issue.level === "warning").length * 2;
  const completeness = [
    item.product.netPrice,
    item.product.validityDays,
    item.product.stayDays,
    item.product.processingTime,
    item.product.sourceUrl,
  ].filter((value) => value !== null).length;

  return completeness - errorPenalty - warningPenalty;
}
