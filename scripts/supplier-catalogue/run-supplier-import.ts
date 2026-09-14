import { resolve } from "node:path";
import { dedupeProducts } from "./dedupe.ts";
import { normalizeCountry, normalizeProducts, slugify } from "./normalize.ts";
import { buildReviewExport, loadLatestReviewProducts, writeReviewExport } from "./review-export.ts";
import { loadSupplierSource } from "./sources.ts";
import type { ImportMode, SupplierId } from "./types.ts";
import { validateProducts } from "./validate.ts";

interface CliOptions {
  supplier: SupplierId;
  destination: string;
  limit: number;
  mode: ImportMode;
  sourceFile?: string;
  fixture?: string;
  output?: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { source, sourceFile } = await loadSupplierSource({
    supplierId: options.supplier,
    mode: options.mode,
    sourceFile: options.sourceFile,
    fixture: options.fixture,
  });

  const normalizedDestination = normalizeCountry(options.destination);
  const normalized = normalizeProducts(source, options.mode);
  const destinationMatched = normalized.filter(
    (product) =>
      product.destinationCountry.toLowerCase() === normalizedDestination.toLowerCase(),
  );
  const validated = validateProducts(destinationMatched);
  const dedupe = dedupeProducts(validated);
  const output = options.output ?? defaultOutputPath(options.supplier, normalizedDestination);
  const previousProducts = await loadLatestReviewProducts({
    reviewDir: resolve("data", "supplier-imports", "review"),
    supplierId: options.supplier,
    destinationSlug: slugify(normalizedDestination),
  });
  const review = buildReviewExport({
    supplierId: options.supplier,
    destination: normalizedDestination,
    requestedLimit: options.limit,
    sourceMode: options.mode,
    sourceFile,
    readCount: source.products.length,
    destinationMatchedCount: destinationMatched.length,
    dedupe,
    previousProducts,
  });

  const writtenOutput = await writeReviewExport(output, review);

  console.log([
    "supplier_import_review_created=true",
    `supplier=${options.supplier}`,
    `destination="${normalizedDestination}"`,
    `read=${review.summary.read}`,
    `matched=${review.summary.destinationMatched}`,
    `exported=${review.summary.exported}`,
    `duplicates=${review.summary.duplicateCount}`,
    `errors=${review.summary.errorCount}`,
    `warnings=${review.summary.warningCount}`,
    `statuses=${summarizeStatuses(review.products.map((product) => product.changeDetectionStatus))}`,
    `output=${writtenOutput}`,
  ].join(" "));
}

function parseArgs(args: string[]): CliOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      values.set(key, "true");
      continue;
    }
    values.set(key, next);
    index += 1;
  }

  const supplier = values.get("supplier") ?? "stampmyvisa";
  const destination = values.get("destination") ?? "United Arab Emirates";
  const limit = Math.min(Number(values.get("limit") ?? 5), 5);
  const mode = (values.get("mode") ?? "saved-html") as ImportMode;

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("--limit must be between 1 and 5");
  }

  if (!["saved-html", "public-web", "live", "live-authorized"].includes(mode)) {
    throw new Error("--mode must be saved-html, public-web, live, or live-authorized");
  }

  return {
    supplier,
    destination,
    limit,
    mode,
    sourceFile: values.get("source-file"),
    fixture: values.get("fixture"),
    output: values.get("output"),
  };
}

function defaultOutputPath(supplier: SupplierId, destination: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return resolve(
    "data",
    "supplier-imports",
    "review",
    `${date}-${supplier}-${slugify(destination)}.review.json`,
  );
}

function summarizeStatuses(statuses: string[]): string {
  const counts = new Map<string, number>();
  for (const status of statuses) counts.set(status, (counts.get(status) ?? 0) + 1);
  return Array.from(counts.entries()).map(([status, count]) => `${status}:${count}`).join(",");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`supplier_import_failed=true message="${message}"`);
  process.exitCode = 1;
});
