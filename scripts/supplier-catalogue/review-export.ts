import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import type {
  ChangeDetectionStatus,
  DedupeResult,
  ImportMode,
  NormalizedSupplierProduct,
  ReviewExport,
  SupplierId,
} from "./types.ts";

export interface BuildReviewExportInput {
  supplierId: SupplierId;
  destination: string;
  requestedLimit: number;
  sourceMode: ImportMode;
  sourceFile: string;
  readCount: number;
  destinationMatchedCount: number;
  dedupe: DedupeResult;
  previousProducts?: NormalizedSupplierProduct[];
}

export function buildReviewExport(input: BuildReviewExportInput): ReviewExport {
  const previousByKey = new Map(
    (input.previousProducts ?? []).map((product) => [product.catalogueKey, product]),
  );
  const selected = input.dedupe.kept.slice(0, input.requestedLimit).map((item) => ({
    ...item,
    product: applyChangeDetection(item.product, previousByKey.get(item.product.catalogueKey)),
  }));
  const validation = selected
    .filter((item) => item.issues.length > 0)
    .map((item) => ({
      catalogueKey: item.product.catalogueKey,
      issues: item.issues,
    }));

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      supplierId: input.supplierId,
      destination: input.destination,
      requestedLimit: input.requestedLimit,
      sourceMode: input.sourceMode,
      sourceFile: input.sourceFile,
    },
    summary: {
      read: input.readCount,
      destinationMatched: input.destinationMatchedCount,
      exported: selected.length,
      duplicateCount: input.dedupe.duplicates.length,
      errorCount: selected.flatMap((item) => item.issues).filter((issue) => issue.level === "error").length,
      warningCount: selected.flatMap((item) => item.issues).filter((issue) => issue.level === "warning").length,
    },
    products: selected.map((item) => item.product),
    validation,
    duplicates: input.dedupe.duplicates,
  };
}

export async function loadLatestReviewProducts(options: {
  reviewDir: string;
  supplierId: SupplierId;
  destinationSlug: string;
}): Promise<NormalizedSupplierProduct[]> {
  const reviewDir = resolve(options.reviewDir);
  let entries: string[];

  try {
    entries = await readdir(reviewDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const supplierSegment = String(options.supplierId);
  const matching = await Promise.all(entries
    .filter((entry) =>
      entry.includes(`-${supplierSegment}-${options.destinationSlug}.review`) &&
      entry.endsWith(".json"),
    )
    .map(async (entry) => ({
      entry,
      modifiedAt: (await stat(join(reviewDir, entry))).mtimeMs,
    })));

  matching.sort((left, right) => right.modifiedAt - left.modifiedAt);

  for (const { entry } of matching) {
    const parsed = JSON.parse(await readFile(join(reviewDir, entry), "utf8")) as ReviewExport;
    if (Array.isArray(parsed.products)) return parsed.products;
  }

  return [];
}

function applyChangeDetection(
  product: NormalizedSupplierProduct,
  previous?: NormalizedSupplierProduct,
): NormalizedSupplierProduct {
  const changeDetectionStatus = detectChange(product, previous);
  const reviewStatus = changeDetectionStatus === "NO_CHANGE"
    ? product.reviewStatus
    : product.reviewStatus === "REJECTED" || product.reviewStatus === "CONFLICT_REVIEW_REQUIRED"
      ? product.reviewStatus
      : "REVIEW_REQUIRED";

  return {
    ...product,
    changeDetectionStatus,
    reviewStatus,
    importStatus: reviewStatus,
  };
}

function detectChange(
  current: NormalizedSupplierProduct,
  previous?: NormalizedSupplierProduct,
): ChangeDetectionStatus {
  if (current.available === false) return "PRODUCT_UNAVAILABLE";
  if (!previous) return "NEW_PRODUCT";

  if (current.commercialHash !== previous.commercialHash) {
    return "PRICE_CHANGED";
  }

  if (current.documentsHash !== previous.documentsHash) {
    return "DOCUMENTS_CHANGED";
  }

  if (current.processingHash !== previous.processingHash) {
    return "PROCESSING_CHANGED";
  }

  if (current.routingHash !== previous.routingHash) {
    return "ROUTING_CHANGED";
  }

  if (current.contentHash !== previous.contentHash) {
    return "REVIEW_REQUIRED";
  }

  return "NO_CHANGE";
}

export async function writeReviewExport(
  outputFile: string,
  review: ReviewExport,
): Promise<string> {
  await mkdir(dirname(outputFile), { recursive: true });
  const ext = extname(outputFile);
  const base = basename(outputFile, ext);
  const dir = dirname(outputFile);

  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const candidate = attempt === 1 ? outputFile : join(dir, `${base}-${attempt}${ext}`);
    try {
      await writeFile(candidate, `${JSON.stringify(review, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST" || (error as NodeJS.ErrnoException).code === "EPERM") {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Unable to create unique review export near ${outputFile}`);
}
