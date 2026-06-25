import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, basename } from "node:path";
import type { DedupeResult, ImportMode, ReviewExport, SupplierId } from "./types.ts";

export interface BuildReviewExportInput {
  supplierId: SupplierId;
  destination: string;
  requestedLimit: number;
  sourceMode: ImportMode;
  sourceFile: string;
  readCount: number;
  destinationMatchedCount: number;
  dedupe: DedupeResult;
}

export function buildReviewExport(input: BuildReviewExportInput): ReviewExport {
  const selected = input.dedupe.kept.slice(0, input.requestedLimit);
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
