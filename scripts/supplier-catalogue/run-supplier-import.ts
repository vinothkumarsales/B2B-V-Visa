import { resolve } from "node:path";
import { dedupeProducts } from "./dedupe.ts";
import { normalizeCountry, normalizeProducts, slugify } from "./normalize.ts";
import { buildReviewExport, writeReviewExport } from "./review-export.ts";
import { loadSupplierSource } from "./sources.ts";
import type { ImportMode, SupplierId } from "./types.ts";
import { validateProducts } from "./validate.ts";

interface CliOptions {
  supplier: SupplierId;
  destination: string;
  limit: number;
  mode: ImportMode;
  sourceFile?: string;
  output?: string;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const { source, sourceFile } = await loadSupplierSource({
    supplierId: options.supplier,
    mode: options.mode,
    sourceFile: options.sourceFile,
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
  const review = buildReviewExport({
    supplierId: options.supplier,
    destination: normalizedDestination,
    requestedLimit: options.limit,
    sourceMode: options.mode,
    sourceFile,
    readCount: source.products.length,
    destinationMatchedCount: destinationMatched.length,
    dedupe,
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
  const mode = (values.get("mode") ?? "sample") as ImportMode;

  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("--limit must be between 1 and 5");
  }

  if (mode !== "sample" && mode !== "local") {
    throw new Error("--mode must be sample or local; live supplier login is intentionally unsupported here");
  }

  return {
    supplier,
    destination,
    limit,
    mode,
    sourceFile: values.get("source-file"),
    output: values.get("output"),
  };
}

function defaultOutputPath(supplier: SupplierId, destination: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return resolve(
    "data",
    "supplier-imports",
    "reviews",
    `${date}-${supplier}-${slugify(destination)}.review.json`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`supplier_import_failed=true message="${message}"`);
  process.exitCode = 1;
});
