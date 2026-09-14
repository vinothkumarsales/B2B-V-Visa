import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SupplierImportSource } from "../types.ts";
import {
  assertNoLiveLogin,
  type LoadSupplierCatalogueInput,
  type LoadSupplierCatalogueResult,
  type SupplierCatalogueProvider,
} from "./provider.ts";

export const atlysB2bProvider: SupplierCatalogueProvider = {
  id: "atlys-b2b",
  name: "Atlys B2B",
  supportsLiveLogin: false,
  async loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult> {
    assertNoLiveLogin(input.mode);

    if (!input.sourceFile) {
      throw new Error("Atlys B2B import is a safe stub; pass --source-file with a local export");
    }

    const sourceFile = resolve(input.sourceFile);
    const parsed = JSON.parse(await readFile(sourceFile, "utf8")) as SupplierImportSource;

    if (!parsed?.supplier?.id || !Array.isArray(parsed.products)) {
      throw new Error(`Invalid supplier import source: ${sourceFile}`);
    }

    if (parsed.supplier.id !== input.supplierId) {
      throw new Error(`Supplier mismatch: expected ${input.supplierId}, found ${parsed.supplier.id}`);
    }

    return { source: parsed, sourceFile };
  },
};
