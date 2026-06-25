import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ImportMode, SupplierId, SupplierImportSource } from "./types.ts";

const SAMPLE_SOURCE_BY_SUPPLIER: Record<string, string> = {
  stampmyvisa: "data/supplier-imports/samples/stampmyvisa.sample.json",
};

export async function loadSupplierSource(options: {
  supplierId: SupplierId;
  mode: ImportMode;
  sourceFile?: string;
}): Promise<{ source: SupplierImportSource; sourceFile: string }> {
  const configuredSource = SAMPLE_SOURCE_BY_SUPPLIER[options.supplierId];
  const sourceFile = resolve(options.sourceFile ?? configuredSource ?? "");

  if (!sourceFile) {
    throw new Error(`No local sample source is configured for supplier ${options.supplierId}`);
  }

  const parsed = JSON.parse(await readFile(sourceFile, "utf8")) as SupplierImportSource;
  assertSupplierSource(parsed, options.supplierId, sourceFile);
  return { source: parsed, sourceFile };
}

function assertSupplierSource(
  value: SupplierImportSource,
  supplierId: SupplierId,
  sourceFile: string,
): void {
  if (!value?.supplier?.id || !Array.isArray(value.products)) {
    throw new Error(`Invalid supplier import source: ${sourceFile}`);
  }

  if (value.supplier.id !== supplierId) {
    throw new Error(`Supplier mismatch: expected ${supplierId}, found ${value.supplier.id}`);
  }
}
