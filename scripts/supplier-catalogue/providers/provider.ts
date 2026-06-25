import type { ImportMode, SupplierId, SupplierImportSource } from "../types.ts";

export interface LoadSupplierCatalogueInput {
  supplierId: SupplierId;
  mode: ImportMode;
  sourceFile?: string;
}

export interface LoadSupplierCatalogueResult {
  source: SupplierImportSource;
  sourceFile: string;
}

export interface SupplierCatalogueProvider {
  id: SupplierId;
  name: string;
  supportsLiveLogin: false;
  loadCatalogue(input: LoadSupplierCatalogueInput): Promise<LoadSupplierCatalogueResult>;
}

export function assertNoLiveLogin(mode: ImportMode): void {
  if (mode !== "sample" && mode !== "local") {
    throw new Error("Live supplier login is intentionally unsupported for supplier catalogue import");
  }
}
