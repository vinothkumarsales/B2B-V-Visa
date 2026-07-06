import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SupplierImportSource } from "../types.ts";
import {
  type LoadSupplierCatalogueInput,
  type LoadSupplierCatalogueResult,
  type SupplierCatalogueProvider,
  assertNoLiveLogin,
} from "./provider.ts";

const DEFAULT_PUBLIC_SNAPSHOT = "scripts/supplier-catalogue/fixtures/visa2fly/public-products.snapshot.json";

export const visa2flyProvider: SupplierCatalogueProvider = {
  id: "visa2fly",
  name: "Visa2Fly",
  supportsLiveLogin: false,
  async loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult> {
    assertNoLiveLogin(input.mode);
    if (input.mode !== "public-web" && input.mode !== "saved-html") {
      throw new Error("--mode must be public-web or saved-html for Visa2Fly imports");
    }

    const sourceFile = resolve(input.sourceFile ?? input.fixture ?? DEFAULT_PUBLIC_SNAPSHOT);
    const parsed = JSON.parse(await readFile(sourceFile, "utf8")) as SupplierImportSource;
    if (parsed.supplier.id !== "visa2fly") {
      throw new Error(`Visa2Fly source must use supplier.id=visa2fly: ${sourceFile}`);
    }
    return { source: parsed, sourceFile };
  },
};
