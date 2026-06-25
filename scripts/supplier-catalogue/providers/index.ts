import type { SupplierId } from "../types.ts";
import { atlysB2bProvider } from "./atlys-b2b.ts";
import type { SupplierCatalogueProvider } from "./provider.ts";
import { stampMyVisaProvider, stampmyvisaProvider } from "./stamp-my-visa.ts";

const PROVIDERS: Record<string, SupplierCatalogueProvider> = {
  "stamp-my-visa": stampMyVisaProvider,
  stampmyvisa: stampmyvisaProvider,
  "atlys-b2b": atlysB2bProvider,
};

export function getSupplierCatalogueProvider(supplierId: SupplierId): SupplierCatalogueProvider {
  const provider = PROVIDERS[supplierId];
  if (!provider) {
    throw new Error(`No supplier catalogue provider is configured for ${supplierId}`);
  }
  return provider;
}

export type { SupplierCatalogueProvider } from "./provider.ts";
