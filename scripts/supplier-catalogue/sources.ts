import type { ImportMode, SupplierId, SupplierImportSource } from "./types.ts";
import { getSupplierCatalogueProvider } from "./providers/index.ts";

export async function loadSupplierSource(options: {
  supplierId: SupplierId;
  mode: ImportMode;
  sourceFile?: string;
  fixture?: string;
}): Promise<{ source: SupplierImportSource; sourceFile: string }> {
  const provider = getSupplierCatalogueProvider(options.supplierId);
  return provider.loadCatalogue(options);
}
