import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SupplierImportSource } from "../types.ts";
import {
  assertNoLiveLogin,
  type LoadSupplierCatalogueInput,
  type LoadSupplierCatalogueResult,
  type SupplierCatalogueProvider,
} from "./provider.ts";

const SAMPLE_SOURCE = "data/supplier-imports/samples/stampmyvisa.sample.json";

export const stampMyVisaProvider: SupplierCatalogueProvider = {
  id: "stamp-my-visa",
  name: "StampMyVisa",
  supportsLiveLogin: false,
  async loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult> {
    assertNoLiveLogin(input.mode);
    return loadLocalSupplierSource(input.sourceFile ?? SAMPLE_SOURCE, input.supplierId);
  },
};

export const stampmyvisaProvider: SupplierCatalogueProvider = {
  ...stampMyVisaProvider,
  id: "stampmyvisa",
};

async function loadLocalSupplierSource(
  sourcePath: string,
  requestedSupplierId: string,
): Promise<LoadSupplierCatalogueResult> {
  const sourceFile = resolve(sourcePath);
  const parsed = JSON.parse(await readFile(sourceFile, "utf8")) as SupplierImportSource;

  if (!parsed?.supplier?.id || !Array.isArray(parsed.products)) {
    throw new Error(`Invalid supplier import source: ${sourceFile}`);
  }

  if (parsed.supplier.id !== requestedSupplierId && requestedSupplierId !== "stamp-my-visa") {
    throw new Error(`Supplier mismatch: expected ${requestedSupplierId}, found ${parsed.supplier.id}`);
  }

  return { source: parsed, sourceFile };
}
